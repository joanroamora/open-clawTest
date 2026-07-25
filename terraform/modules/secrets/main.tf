variable "environment" { type = string }
variable "gemini_api_key" { type = string; sensitive = true }
variable "rentcast_api_key" { type = string; sensitive = true }
variable "batchleads_api_key" { type = string; sensitive = true }

resource "aws_secretsmanager_secret" "api_secrets" {
  name        = "houston-offmarket-api-keys-${var.environment}"
  description = "API keys for Gemini, RentCast, BatchLeads"
}

resource "aws_secretsmanager_secret_version" "api_secrets_val" {
  secret_id = aws_secretsmanager_secret.api_secrets.id
  secret_string = jsonencode({
    GEMINI_API_KEY     = var.gemini_api_key
    RENTCAST_API_KEY   = var.rentcast_api_key
    BATCHLEADS_API_KEY = var.batchleads_api_key
  })
}

output "secret_arn" {
  value = aws_secretsmanager_secret.api_secrets.arn
}
