import os
import io
import json
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Houston Off-Market Deal Machine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "offmarket")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
S3_REPORTS_BUCKET = os.getenv("S3_REPORTS_BUCKET", "houston-offmarket-reports-dev")

def get_db_connection():
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD
    )

class StatusUpdate(BaseModel):
    status: str

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Houston Off-Market Deal Machine API"}

@app.get("/properties")
def get_raw_properties(limit: int = 50):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM raw_properties ORDER BY created_at DESC LIMIT %s;", (limit,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {"data": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/enriched")
def get_enriched_properties(status: Optional[str] = None, limit: int = 100):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if status:
            cur.execute(
                "SELECT * FROM enriched_properties WHERE status = %s ORDER BY created_at DESC LIMIT %s;",
                (status, limit)
            )
        else:
            cur.execute("SELECT * FROM enriched_properties ORDER BY created_at DESC LIMIT %s;", (limit,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {"data": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/enriched/{property_id}/status")
def update_property_status(property_id: str, payload: StatusUpdate):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE enriched_properties SET status = %s, updated_at = NOW() WHERE id = %s RETURNING id;",
            (payload.status.upper(), property_id)
        )
        updated = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not updated:
            raise HTTPException(status_code=404, detail="Property not found")
        return {"status": "success", "property_id": property_id, "new_status": payload.status.upper()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports/{property_id}")
def generate_cma_report(property_id: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM enriched_properties WHERE id = %s;", (property_id,))
        prop = cur.fetchone()
        cur.close()
        conn.close()

        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=15
        )
        
        story.append(Paragraph("Comparative Market Analysis (CMA) Report", title_style))
        story.append(Paragraph(f"<b>Property Address:</b> {prop['address']}", styles['Normal']))
        story.append(Paragraph(f"<b>Owner:</b> {prop['owner_name']} ({prop['owner_phone']} | {prop['owner_email']})", styles['Normal']))
        story.append(Spacer(1, 15))

        table_data = [
            ["Metric", "Value"],
            ["After Repair Value (ARV)", f"${float(prop['arv'] or 0):,.2f}"],
            ["Estimated Rehab Cost", f"${float(prop['rehab_estimate'] or 0):,.2f}"],
            ["Calculated Maximum Offer", f"${float(prop['offer'] or 0):,.2f}"],
            ["Current Deal Status", str(prop['status'])],
        ]

        t = Table(table_data, colWidths=[200, 300])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ]))
        story.append(t)
        story.append(Spacer(1, 20))

        story.append(Paragraph("<b>Comparable Sales (Comps):</b>", styles['Heading2']))
        comps = prop.get('comps') or []
        if isinstance(comps, str):
            comps = json.loads(comps)

        comps_table_data = [["Address", "Price", "Distance"]]
        for c in comps:
            comps_table_data.append([
                c.get('address', 'N/A'),
                f"${c.get('price', 0):,.2f}",
                f"{c.get('distance', 0)} mi"
            ])

        tc = Table(comps_table_data, colWidths=[250, 150, 100])
        tc.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ]))
        story.append(tc)

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        # Upload to S3 in background if configured
        try:
            s3 = boto3.client("s3")
            s3_key = f"cma_reports/{property_id}.pdf"
            s3.put_object(
                Bucket=S3_REPORTS_BUCKET,
                Key=s3_key,
                Body=pdf_bytes,
                ContentType="application/pdf"
            )
            logging.info(f"Uploaded PDF report to s3://{S3_REPORTS_BUCKET}/{s3_key}")
        except Exception as s3_err:
            logging.warning(f"S3 PDF upload skipped: {s3_err}")

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=cma_report_{property_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhooks/ses")
def ses_webhook(payload: dict):
    # Handle incoming email responses from SES / SNS
    logging.info(f"Received SES webhook event: {payload}")
    return {"status": "received"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
