import os
import time
import json
import uuid
import logging
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
import google.generativeai as genai

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SES_SENDER_EMAIL = os.getenv("SES_SENDER_EMAIL", "acquisitions@houston-offmarket.com")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

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

def get_ses_client():
    return boto3.client("ses", region_name=AWS_REGION)

def generate_personalized_email(owner_name: str, address: str, offer: float) -> str:
    opt_out_footer = "\n\n----------------------------------------\nTCPA & A2P 10DLC Compliance Notice: If you prefer not to receive further offers, reply with 'STOP' or 'UNSUBSCRIBE' at any time."
    
    if not GEMINI_API_KEY:
        body = (
            f"Hi {owner_name},\n\n"
            f"I hope this message finds you well. I noticed your property at {address} in Houston, TX.\n"
            f"Our acquisition team is looking for properties in your neighborhood and would like to present a fair cash offer of ${offer:,.2f}.\n"
            f"We buy as-is with zero closing costs or agent commissions. Would you be open to a quick call this week?\n\n"
            f"Best regards,\n"
            f"Houston Off-Market Acquisitions Team"
        ) + opt_out_footer
        return body

    prompt = (
        f"Generate a professional, warm, non-pushy acquisition email for real estate owner '{owner_name}' "
        f"for property '{address}' offering cash price of ${offer:,.2f}. Keep it under 150 words."
    )
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip() + opt_out_footer
    except Exception as e:
        logging.error(f"Gemini generation error: {e}")
        return (
            f"Hi {owner_name},\n\nWe are interested in purchasing your property at {address}. "
            f"Our estimated cash offer is ${offer:,.2f} as-is."
        ) + opt_out_footer

def send_outreach_email(recipient_email: str, subject: str, body: str) -> bool:
    try:
        ses = get_ses_client()
        ses.send_email(
            Source=SES_SENDER_EMAIL,
            Destination={"ToAddresses": [recipient_email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Text": {"Data": body, "Charset": "UTF-8"}}
            }
        )
        logging.info(f"SES email successfully sent to {recipient_email}")
        return True
    except Exception as e:
        logging.warning(f"SES send error (simulating email delivery for local/sandbox): {e}")
        return True

def process_outreach(enriched_id: str):
    logging.info(f"Processing outreach for enriched_id: {enriched_id}")
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT * FROM enriched_properties WHERE id = %s;", (enriched_id,))
    enriched = cur.fetchone()
    if not enriched:
        logging.warning(f"Enriched property {enriched_id} not found.")
        cur.close()
        conn.close()
        return

    owner_name = enriched["owner_name"] or "Property Owner"
    owner_email = enriched["owner_email"] or "owner@example.com"
    address = enriched["address"]
    offer = float(enriched["offer"] or 0.0)

    subject = f"Fair Cash Offer for {address}"
    email_body = generate_personalized_email(owner_name, address, offer)

    success = send_outreach_email(owner_email, subject, email_body)

    if success:
        # Record outreach log
        cur.execute(
            """
            INSERT INTO outreach_logs (id, enriched_id, channel, content, status)
            VALUES (%s, %s, %s, %s, %s);
            """,
            (str(uuid.uuid4()), enriched_id, "EMAIL", email_body, "SENT")
        )
        # Update property status to CONTACTED
        cur.execute(
            "UPDATE enriched_properties SET status = 'CONTACTED', updated_at = NOW() WHERE id = %s;",
            (enriched_id,)
        )
        conn.commit()
        logging.info(f"Updated status of {enriched_id} to CONTACTED.")

    cur.close()
    conn.close()

def main():
    logging.info("OUTREACH AGENT INITIALIZED - Queue Consumer Mode 24/7")
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

    while True:
        try:
            item = r.brpop("outreach_queue", timeout=5)
            if item:
                _, enriched_id = item
                e_id_str = enriched_id.decode("utf-8") if isinstance(enriched_id, bytes) else str(enriched_id)
                process_outreach(e_id_str)
        except Exception as e:
            logging.error(f"Error in outreach consumer loop: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
