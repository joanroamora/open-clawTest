import os
import time
import json
import uuid
import logging
import requests
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import google.generativeai as genai

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
RENTCAST_API_KEY = os.getenv("RENTCAST_API_KEY", "demo_key")
BATCHLEADS_API_KEY = os.getenv("BATCHLEADS_API_KEY", "demo_key")
S3_ENRICHED_BUCKET = os.getenv("S3_ENRICHED_BUCKET", "houston-offmarket-enriched-dev")

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "offmarket")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_db_connection():
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD
    )

def get_s3_client():
    return boto3.client("s3")

def estimate_rehab_with_gemini(description: str, year_built: int) -> float:
    if not GEMINI_API_KEY:
        logging.info("GEMINI_API_KEY not set. Using rule-based fallback rehab estimator.")
        age = 2026 - (year_built or 1980)
        return round(float(min(85000, max(20000, age * 900))), 2)
    
    prompt = f"Given this property description: '{description}' and year built: {year_built}, estimate condition and rehab cost in Texas as a numeric integer string."
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Parse first number found in text
        numbers = [int(s) for s in text.replace("$", "").replace(",", "").split() if s.isdigit()]
        if numbers:
            return float(numbers[0])
        return 35000.0
    except Exception as e:
        logging.error(f"Gemini API error: {e}. Fallback rehab cost applied.")
        return 35000.0

def fetch_comps_and_arv(address: str, zip_code: str):
    url = f"https://api.rentcast.io/v1/comps/value?address={address}&zipCode={zip_code}&radius=0.5&daysOld=180&compCount=3"
    headers = {"X-Api-Key": RENTCAST_API_KEY, "accept": "application/json"}
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            data = res.json()
            arv = data.get("price", 320000.0)
            comps = data.get("comps", [])
            return arv, comps
    except Exception as e:
        logging.error(f"RentCast comps API error: {e}")
    
    comps = [
        {"address": f"101 Nearby St, Houston, TX {zip_code}", "price": 310000, "distance": 0.2},
        {"address": f"105 Nearby St, Houston, TX {zip_code}", "price": 330000, "distance": 0.3},
        {"address": f"109 Nearby St, Houston, TX {zip_code}", "price": 320000, "distance": 0.4},
    ]
    arv = sum(c["price"] for c in comps) / len(comps)
    return arv, comps

def skip_trace_owner(address: str):
    # Call BatchLeads or IDI Data API
    return {
        "owner_name": "John Doe",
        "owner_phone": "+17135550199",
        "owner_email": "seller.houston.offmarket@example.com"
    }

def process_enrichment(raw_id: str):
    logging.info(f"Processing enrichment for raw_id: {raw_id}")
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT * FROM raw_properties WHERE id = %s;", (raw_id,))
    raw_prop = cur.fetchone()
    if not raw_prop:
        logging.warning(f"Raw property {raw_id} not found in database.")
        cur.close()
        conn.close()
        return

    data = raw_prop["data"]
    address = raw_prop["address"]
    zip_code = raw_prop["zip"]
    desc = data.get("description", "")
    year_built = data.get("yearBuilt", 1980)

    # 1. Gemini Rehab estimate
    rehab = estimate_rehab_with_gemini(desc, year_built)
    
    # 2. Comps & ARV
    arv, comps = fetch_comps_and_arv(address, zip_code)
    
    # 3. Calculate Offer: (ARV * 0.70) - rehab - 15000 wholesale fee
    offer = (arv * 0.70) - rehab - 15000.0
    if offer < 10000:
        offer = 10000.0

    # 4. Skip Trace Owner
    owner_info = skip_trace_owner(address)
    
    enriched_id = str(uuid.uuid4())
    
    # 5. Save to Postgres
    cur.execute(
        """
        INSERT INTO enriched_properties 
        (id, raw_id, address, zip, owner_name, owner_email, owner_phone, arv, rehab_estimate, offer, comps, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
        """,
        (
            enriched_id, raw_id, address, zip_code,
            owner_info["owner_name"], owner_info["owner_email"], owner_info["owner_phone"],
            arv, rehab, offer, json.dumps(comps), "NEW"
        )
    )
    conn.commit()

    # 6. Save to S3
    s3_payload = {
        "enriched_id": enriched_id,
        "raw_id": raw_id,
        "address": address,
        "zip": zip_code,
        "owner": owner_info,
        "arv": arv,
        "rehab_estimate": rehab,
        "offer": offer,
        "comps": comps
    }
    
    try:
        s3 = get_s3_client()
        s3_key = f"{enriched_id}.json"
        s3.put_object(
            Bucket=S3_ENRICHED_BUCKET,
            Key=s3_key,
            Body=json.dumps(s3_payload),
            ContentType="application/json"
        )
        logging.info(f"Saved enriched data to s3://{S3_ENRICHED_BUCKET}/{s3_key}")
    except Exception as s3_err:
        logging.warning(f"S3 upload warning: {s3_err}")

    # 7. Push to Redis outreach_queue
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
    r.lpush("outreach_queue", enriched_id)
    logging.info(f"Successfully enriched {address} -> Offer: ${offer:,.2f}. Pushed {enriched_id} to outreach_queue")

    cur.close()
    conn.close()

def main():
    logging.info("ENRICHER AGENT INITIALIZED - Queue Consumer Mode 24/7")
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

    while True:
        try:
            item = r.brpop("enrich_queue", timeout=5)
            if item:
                _, raw_id = item
                raw_id_str = raw_id.decode("utf-8") if isinstance(raw_id, bytes) else str(raw_id)
                process_enrichment(raw_id_str)
        except Exception as e:
            logging.error(f"Error in enricher consumer loop: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
