# Houston Off-Market Deal Machine 🚀

Autonomous 24/7 AI-Agent Pipeline built with **OpenClaw**, **Gemini 2.5 Flash**, **FastAPI**, **Next.js 14**, **Terraform**, and **Ansible** on **AWS**.

Targeting Houston, TX Off-Market Sellers in zip codes: `77083`, `77082`, `77407`, `77002`, `77007`.

---

## 🏗️ Architecture Diagram

```
                              +-------------------------------------------+
                              |              AWS ALB / WAF                |
                              +--------------------+----------------------+
                                                   |
                     +-----------------------------+-----------------------------+
                     | (Public Subnet)                                           | (Private App Subnets)
                     v                                                           v
          +-----------------------+                                 +-----------------------+
          |  Frontend EC2         |                                 |  Outreach & API EC2   |
          |  (Next.js 14 Kanban)  |                                 |  (FastAPI + Outreach) |
          +-----------------------+                                 +-----------+-----------+
                                                                                |
                                                                                v
  +-------------------------------------------------------------------------------------------------+
  | Private App Subnets (24/7 Infinite Agent Loop)                                                 |
  |                                                                                                 |
  |   +-------------------+          +-------------------+          +-------------------+           |
  |   |  SCOUT EC2        |  Redis   |  ENRICHER EC2     |  Redis   |  OUTREACH EC2     |           |
  |   |  (RentCast/HCAD)  | -------->|  (Gemini + Comps) | -------->|  (Gemini + SES)   |           |
  |   +---------+---------+  Queue   +---------+---------+  Queue   +---------+---------+           |
  |             |                              |                              |                     |
  +-------------|------------------------------|------------------------------|---------------------+
                |                              |                              |
                v                              v                              v
      +-------------------+          +-------------------+          +-------------------+
      | S3 Raw Bucket     |          | S3 Enriched Bucket|          | S3 Reports Bucket |
      +-------------------+          +-------------------+          +-------------------+
                |                              |                              |
                +------------------------------+------------------------------+
                                               |
                                               v
                                   +-----------------------+
                                   |  RDS Postgres 15 DB   |
                                   |  (Private Data Subnet)|
                                   +-----------------------+
```

---

## 🤖 OpenClaw & Gemini 2.5 Flash Setup

### Gemini Authentication & OpenClaw
OpenClaw agents run inside continuous Docker loops / systemd services.

- **Authentication**: Set `GEMINI_API_KEY` in environment variables or AWS Secrets Manager.
- OpenClaw auto-reads `GEMINI_API_KEY` for LLM calls (rehab estimation, mail generation). No manual browser OAuth is required.
- **OpenClaw Gateway**: Listens on port `:18789` on each agent host and manages systemd auto-restarts (`Restart=always`).

---

## 💰 Estimated Monthly AWS Cost Breakdown

| Resource | Configuration | Estimated Monthly Cost |
| :--- | :--- | :--- |
| **Frontend EC2** | 1x `t3.medium` (Public Subnet) | ~$30.36 |
| **Scout EC2** | 1x `t3.large` (Private App Subnet) | ~$60.72 |
| **Enricher EC2** | 1x `t3.xlarge` (Private App Subnet) | ~$121.44 |
| **Outreach & API EC2** | 1x `t3.medium` (Private App Subnet) | ~$30.36 |
| **RDS Postgres** | `db.t3.micro` (Single-AZ, 20GB gp3) | ~$15.00 |
| **ElastiCache Redis** | `cache.t3.micro` | ~$12.50 |
| **NAT Gateways** | 2x NAT Gateways (~720 hrs + traffic) | ~$65.00 |
| **ALB & WAF** | Application Load Balancer + Basic WAF | ~$25.00 |
| **S3 Buckets** | 3 Buckets (Raw, Enriched, Reports with IA lifecycle) | ~$5.00 |
| **TOTAL ESTIMATE** | **High-Availability Production Setup** | **~$365 / month** |

*Tip: Convert EC2 instances to AWS Savings Plans / Reserved Instances to reduce cost by 40%.*

---

## 🔑 How to Set Secrets

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in credentials:
   - `GEMINI_API_KEY`
   - `RENTCAST_API_KEY`
   - `BATCHLEADS_API_KEY`
   - `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`

3. In GitHub Repository Secrets:
   Add `GEMINI_API_KEY`, `RENTCAST_API_KEY`, `BATCHLEADS_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

---

## 🚀 How to Deploy

### 1. Local Development (Docker Compose)
```bash
docker compose up --build -d
```
- Frontend: `http://localhost:3000`
- FastAPI Backend: `http://localhost:8000`

### 2. Full AWS Automated Deployment
Deploy via GitHub Actions automatically on push to `main`, or manually via CLI:

```bash
# 1. Terraform Infrastructure Provisioning
cd terraform
terraform init
terraform apply -auto-approve

# 2. Ansible Configuration & Docker Deployment
cd ../ansible
ansible-playbook -i inventory.ini playbook.yml
```

---

## ⚙️ CI/CD Pipeline Summary
- `.github/workflows/ci.yml`: Runs on push/PR, lints Python & TypeScript.
- `.github/workflows/publish.yml`: Builds Docker images and publishes to GitHub Container Registry (`ghcr.io`).
- `.github/workflows/deploy.yml`: Provisions AWS resources with Terraform and runs Ansible playbooks.
