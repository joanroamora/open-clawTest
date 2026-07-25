variable "vpc_id" { type = string }
variable "private_data_subnet_ids" { type = list(string) }
variable "app_subnet_cidrs" { type = list(string) }
variable "db_password" { type = string }
variable "environment" { type = string }
variable "name_suffix" { type = string }

resource "aws_db_subnet_group" "rds" {
  name       = "hom-db-sub-${var.environment}-${var.name_suffix}"
  subnet_ids = var.private_data_subnet_ids

  tags = { Name = "houston-offmarket-db-subnet-group" }
}

resource "aws_security_group" "rds_sg" {
  name        = "houston-offmarket-rds-sg-${var.environment}"
  description = "Allow inbound postgres from App Subnets"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.app_subnet_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "houston-offmarket-rds-sg" }
}

resource "aws_db_instance" "postgres" {
  identifier             = "hom-db-${var.environment}-${var.name_suffix}"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_type           = "gp3"
  db_name                = "offmarket"
  username               = "postgres"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  multi_az               = false
  skip_final_snapshot    = true
  publicly_accessible    = false

  tags = { Name = "houston-offmarket-rds-postgres" }
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}
