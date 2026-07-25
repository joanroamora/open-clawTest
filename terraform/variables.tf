variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS Region for deployment"
}

variable "environment" {
  type        = string
  default     = "prod"
  description = "Deployment environment name"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block for VPC"
}

variable "admin_ip_cidr" {
  type        = string
  default     = "0.0.0.0/0" # Replace with specific IP for SSH restriction
  description = "Admin IP allowed for SSH access"
}

variable "db_password" {
  type        = string
  sensitive   = true
  default     = "OffMarket2026SecurePass!"
  description = "PostgreSQL DB password"
}

variable "gemini_api_key" {
  type        = string
  sensitive   = true
  default     = "CHANGE_ME_GEMINI_KEY"
}

variable "rentcast_api_key" {
  type        = string
  sensitive   = true
  default     = "CHANGE_ME_RENTCAST_KEY"
}

variable "batchleads_api_key" {
  type        = string
  sensitive   = true
  default     = "CHANGE_ME_BATCHLEADS_KEY"
}

variable "github_token" {
  type        = string
  sensitive   = true
  default     = ""
}
