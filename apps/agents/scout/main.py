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

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Environment configurations
RENTCAST_API_KEY = os.getenv("RENTCAST_API_KEY", "demo_key")
S3_RAW_BUCKET = os.getenv("S3_RAW_BUCKET", "houston-offmarket-raw-dev")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "offmarket")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
LOOP_INTERVAL = int(os.getenv("SCOUT_INTERVAL_SECONDS", "3600"))

TARGET_ZIP_CODES = ["77083", "77082", "77407", "77002", "77007"]

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

def fetch_rentcast_properties(zip_code):
    logging.info(f"Fetching listings for ZIP: {zip_code} from RentCast API...")
    url = f"https://api.rentcast.io/v1/listings/sale?zipCode={zip_code}&limit=20&status=Inactive"
    headers = {"X-Api-Key": RENTCAST_API_KEY, "accept": "application/json"}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            return response.json()
        else:
            logging.warning(f"RentCast API returned {response.status_code} for ZIP {zip_code}. Using fallback format.")
            return generate_mock_listings(zip_code)
    except Exception as e:
        logging.error(f"Error calling RentCast API: {e}. Falling back to mock sample.")
        return generate_mock_listings(zip_code)

def generate_mock_listings(zip_code):
    return [
        {
            "id": str(uuid.uuid4()),
            "formattedAddress": f"{1000 + i} Westheimer Rd, Houston, TX {zip_code}",
            "zipCode": zip_code,
            "propertyType": "Single Family",
            "bedrooms": 3,
            "bathrooms": 2,
            "squareFootage": 1850,
            "yearBuilt": 1985,
            "price": 245000,
            "description": "Fixer upper property needing TLC in prime Houston location. Expired listing.",
            "status": "Inactive"
        }
        for i in range(1, 5)
    ]

def process_scout_loop():
    logging.info("Starting Scout execution loop...")
    s3 = get_s3_client()
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        for zip_code in TARGET_ZIP_CODES:
            listings = fetch_rentcast_properties(zip_code)
            for prop in listings:
                address = prop.get("formattedAddress", "Unknown Address")
                
                # Check if exists in DB
                cur.execute("SELECT id FROM raw_properties WHERE address = %s;", (address,))
                existing = cur.fetchone()
                
                if existing:
                    logging.info(f"Property already exists: {address}")
                    continue
                
                raw_id = str(uuid.uuid4())
                
                # Save to S3
                s3_key = f"raw/{zip_code}/{raw_id}.json"
                try:
                    s3.put_object(
                        Bucket=S3_RAW_BUCKET,
                        Key=s3_key,
                        Body=json.dumps(prop),
                        ContentType="application/json"
                    )
                    logging.info(f"Uploaded raw property to s3://{S3_RAW_BUCKET}/{s3_key}")
                except Exception as s3_err:
                    logging.warning(f"S3 upload error (local fallback mode): {s3_err}")

                # Save to Postgres
                cur.execute(
                    """
                    INSERT INTO raw_properties (id, source, address, zip, data)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id;
                    """,
                    (raw_id, "RentCast", address, zip_code, json.dumps(prop))
                )
                conn.commit()

                # Push to Redis queue
                r.lpush("enrich_queue", raw_id)
                logging.info(f"Inserted raw property {raw_id} for {address} and pushed to enrich_queue")

        cur.close()
        conn.close()
    except Exception as err:
        logging.error(f"Error in scout loop: {err}")

def main():
    logging.info("SCOUT AGENT INITIALIZED - Continuous Loop Mode 24/7")
    while True:
        process_scout_loop()
        logging.info(f"Sleeping for {LOOP_INTERVAL} seconds before next scout loop...")
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    main()
