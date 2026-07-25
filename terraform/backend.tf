terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # S3 backend configuration for remote terraform state
  # Uncomment when state bucket is created:
  # backend "s3" {
  #   bucket         = "houston-offmarket-tfstate-bucket"
  #   key            = "offmarket/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "Houston-OffMarket-Deal-Machine"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
