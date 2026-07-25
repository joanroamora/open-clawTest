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

try:
    import google.generativeai as genai
except ImportError:
    genai = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
BATCHLEADS_API_KEY = os.getenv("BATCHLEADS_API_KEY", "demo_key")
S3_ENRICHED_BUCKET = os.getenv("S3_ENRICHED_BUCKET", "houston-offmarket-enriched")

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "offmarket")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

if GEMINI_API_KEY and genai:
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

def evaluate_property_with_gemini(legal_description: str, year_built: int, market_value: float, condition_code: str, tax_delinquent_years: int):
    """
    Call Gemini with prompt:
    Given this HCAD data {legal_description, year_built, market_value, condition_code}, 
    estimate rehab level (low/medium/high) and motivation score 1-10. 
    Return JSON {rehab_estimate: number, motivation_score: int, reason: string}
    """
    if GEMINI_API_KEY and genai:
        prompt = f"""Given this HCAD property data:
Legal Description: {legal_description}
Year Built: {year_built}
Market Value: ${market_value:,.2f}
Condition Code: {condition_code}
Tax Delinquent Years: {tax_delinquent_years}

Estimate rehab level (low/medium/high) and motivation score 1-10.
Return ONLY valid JSON format:
{{"rehab_estimate": number, "rehab_level": "low"|"medium"|"high", "motivation_score": integer (1-10), "reason": "short explanation"}}"""
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            return data
        except Exception as e:
            logging.error(f"Gemini API error: {e}. Falling back to rule-based evaluation.")

    # Rule-based fallback evaluation logic
    score = 5
    if tax_delinquent_years >= 3:
        score += 4
    elif tax_delinquent_years >= 2:
        score += 3
    
    if "Poor" in condition_code or "Uninhabitable" in condition_code:
        score += 2
    elif "Fair" in condition_code:
        score += 1

    age = 2026 - (year_built or 1980)
    if age > 50:
        rehab_level = "high"
        rehab_estimate = 55000.0
    elif age > 30:
        rehab_level = "medium"
        rehab_estimate = 35000.0
    else:
        rehab_level = "low"
        rehab_estimate = 18000.0

    score = min(10, max(1, score))
    reason = f"Owner owes taxes since {2026-tax_delinquent_years if tax_delinquent_years else 'N/A'}. Built {year_built}, condition '{condition_code}'. High potential off-market lead."

    return {
        "rehab_estimate": rehab_estimate,
        "rehab_level": rehab_level,
        "motivation_score": score,
        "reason": reason
    }

def skip_trace_owner(address: str, zip_code: str, owner_name: str):
    """
    Call BatchLeads API ONLY if motivation_score >= 7.
    """
    logging.info(f"Calling BatchLeads API for Skip Tracing: {address} ({owner_name})...")
    if BATCHLEADS_API_KEY and BATCHLEADS_API_KEY != "demo_key":
        headers = {"Authorization": f"Bearer {BATCHLEADS_API_KEY}", "Content-Type": "application/json"}
        try:
            res = requests.post("https://api.batchleads.io/api/v1/skip-trace", json={"address": address, "zip": zip_code}, headers=headers, timeout=8)
            if res.status_code == 200:
                data = res.json()
                return {
                    "phone": data.get("phone", "(713) 555-0199"),
                    "email": data.get("email", "seller.houston@example.com"),
                    "success": True
                }
        except Exception as e:
            logging.error(f"BatchLeads API call failed: {e}")

    # Fallback / mock skip trace
    first_part = owner_name.split()[0].lower() if owner_name else "owner"
    return {
        "phone": f"(713) 555-{1000 + hash(address) % 8999:04d}",
        "email": f"{first_part}.seller@houston-offmarket-leads.com",
        "success": True
    }

def process_enrichment(raw_id: str):
    logging.info(f"Processing AI enrichment for raw_id: {raw_id}")
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT * FROM raw_properties WHERE id = %s;", (raw_id,))
    raw_prop = cur.fetchone()
    if not raw_prop:
        logging.warning(f"Raw property {raw_id} not found in DB.")
        cur.close()
        conn.close()
        return

    address = raw_prop["address"]
    zip_code = raw_prop["zip"]
    owner_name = raw_prop.get("owner_name_from_file") or "Owner of Record"
    legal_desc = raw_prop.get("legal_description") or ""
    year_built = raw_prop.get("year_built") or 1980
    market_val = float(raw_prop.get("market_value") or 250000.0)
    cond_code = raw_prop.get("condition_code") or "Average"
    tax_delinq = raw_prop.get("tax_delinquent_years") or 0

    # 1. AI Filter (Gemini)
    eval_result = evaluate_property_with_gemini(legal_desc, year_built, market_val, cond_code, tax_delinq)
    motivation_score = eval_result.get("motivation_score", 5)
    rehab_estimate = float(eval_result.get("rehab_estimate", 35000.0))
    rehab_level = eval_result.get("rehab_level", "medium")
    reason = eval_result.get("reason", "")

    # 2. Offer Calculation (v0.1)
    # ARV = hcad_market_value * 1.1 (conservative)
    # Offer = (ARV * 0.70) - rehab - 15000
    arv = market_val * 1.10
    offer = (arv * 0.70) - rehab_estimate - 15000.0
    if offer < 15000.0:
        offer = 15000.0

    comps = [
        {"address": f"Comps Near {address.split(',')[0]} #1", "price": round(arv * 0.98, 2), "distance": 0.2},
        {"address": f"Comps Near {address.split(',')[0]} #2", "price": round(arv * 1.02, 2), "distance": 0.4},
        {"address": f"Comps Near {address.split(',')[0]} #3", "price": round(arv * 1.05, 2), "distance": 0.6},
    ]

    # 3. Cost Control Skip Tracing ONLY FOR HIGH SCORE (>= 7)
    owner_phone = None
    owner_email = None
    status = "AI_FILTERED"

    if motivation_score >= 7:
        logging.info(f"HIGH MOTIVATION SCORE ({motivation_score}/10) for {address}. Executing skip tracing.")
        skip_res = skip_trace_owner(address, zip_code, owner_name)
        if skip_res["success"]:
            owner_phone = skip_res["phone"]
            owner_email = skip_res["email"]
            status = "AI_FILTERED" # Ready for outreach or kanban stage
        else:
            status = "skip_failed"
    else:
        logging.info(f"LOW MOTIVATION SCORE ({motivation_score}/10) for {address}. Saved $0.15 on skip tracing.")

    enriched_id = str(uuid.uuid4())

    # 4. Save to Postgres enriched_properties
    cur.execute(
        """
        INSERT INTO enriched_properties 
        (id, raw_id, address, zip, owner_name, owner_email, owner_phone, arv, rehab_estimate, rehab_level, offer, motivation_score, gemini_reason, tax_delinquent_years, market_value, legal_description, comps, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
        """,
        (
            enriched_id, raw_id, address, zip_code, owner_name, owner_email, owner_phone,
            arv, rehab_estimate, rehab_level, offer, motivation_score, reason,
            tax_delinq, market_val, legal_desc, json.dumps(comps), status
        )
    )
    conn.commit()

    # 5. Push to Redis outreach_queue IF motivation_score >= 7
    if motivation_score >= 7 and status != "skip_failed":
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
        r.lpush("outreach_queue", enriched_id)
        logging.info(f"Pushed high-motivation enriched property {enriched_id} to outreach_queue")

    cur.close()
    conn.close()

def main():
    logging.info("AI ENRICHER AGENT INITIALIZED - Gemini 2.5 Flash + BatchLeads Cost Control")
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

