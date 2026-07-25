variable "environment" { type = string }

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Raw Bucket
resource "aws_s3_bucket" "raw" {
  bucket        = "houston-offmarket-raw-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "raw_ver" {
  bucket = aws_s3_bucket.raw.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_enc" {
  bucket = aws_s3_bucket.raw.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "raw_block" {
  bucket                  = aws_s3_bucket.raw.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "raw_lc" {
  bucket = aws_s3_bucket.raw.id
  rule {
    id     = "archive_90_days"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

# Enriched Bucket
resource "aws_s3_bucket" "enriched" {
  bucket        = "houston-offmarket-enriched-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "enriched_ver" {
  bucket = aws_s3_bucket.enriched.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "enriched_enc" {
  bucket = aws_s3_bucket.enriched.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "enriched_block" {
  bucket                  = aws_s3_bucket.enriched.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "enriched_lc" {
  bucket = aws_s3_bucket.enriched.id
  rule {
    id     = "archive_90_days"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

# Reports Bucket
resource "aws_s3_bucket" "reports" {
  bucket        = "houston-offmarket-reports-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "reports_ver" {
  bucket = aws_s3_bucket.reports.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports_enc" {
  bucket = aws_s3_bucket.reports.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "reports_block" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "reports_lc" {
  bucket = aws_s3_bucket.reports.id
  rule {
    id     = "archive_90_days"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

output "raw_bucket_name" { value = aws_s3_bucket.raw.id }
output "raw_bucket_arn" { value = aws_s3_bucket.raw.arn }
output "enriched_bucket_name" { value = aws_s3_bucket.enriched.id }
output "enriched_bucket_arn" { value = aws_s3_bucket.enriched.arn }
output "reports_bucket_name" { value = aws_s3_bucket.reports.id }
output "reports_bucket_arn" { value = aws_s3_bucket.reports.arn }
