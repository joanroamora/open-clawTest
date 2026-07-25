variable "raw_bucket_arn" { type = string }
variable "enriched_bucket_arn" { type = string }
variable "reports_bucket_arn" { type = string }
variable "environment" { type = string }

resource "aws_iam_role" "ec2_agent_role" {
  name = "houston-offmarket-ec2-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "s3_secrets_policy" {
  name        = "houston-offmarket-s3-secrets-policy-${var.environment}"
  description = "Allows EC2 instances access to S3 buckets and Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.raw_bucket_arn,
          "${var.raw_bucket_arn}/*",
          var.enriched_bucket_arn,
          "${var.enriched_bucket_arn}/*",
          var.reports_bucket_arn,
          "${var.reports_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_policy" {
  role       = aws_iam_role.ec2_agent_role.name
  policy_arn = aws_iam_policy.s3_secrets_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "houston-offmarket-ec2-profile-${var.environment}"
  role = aws_iam_role.ec2_agent_role.name
}

output "instance_profile_name" {
  value = aws_iam_instance_profile.ec2_profile.name
}
