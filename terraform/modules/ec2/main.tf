variable "vpc_id" { type = string }
variable "public_subnet_1a_id" { type = string }
variable "private_app_subnet_1a_id" { type = string }
variable "private_app_subnet_1b_id" { type = string }
variable "instance_profile_name" { type = string }
variable "admin_ip_cidr" { type = string }
variable "environment" { type = string }
variable "name_suffix" { type = string }

# AMI Lookup for Ubuntu 24.04 LTS
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Automatically generate a valid 4096-bit RSA OpenSSH KeyPair
resource "tls_private_key" "deployer_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "deployer" {
  key_name   = "hom-key-${var.environment}-${var.name_suffix}"
  public_key = tls_private_key.deployer_key.public_key_openssh
}

# Public Security Group for Frontend
resource "aws_security_group" "frontend_sg" {
  name        = "hom-fe-sg-${var.environment}-${var.name_suffix}"
  description = "Security Group for Frontend EC2"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "houston-offmarket-frontend-sg" }
}

# Private Security Group for Agents
resource "aws_security_group" "agents_sg" {
  name        = "hom-ag-sg-${var.environment}-${var.name_suffix}"
  description = "Security Group for Private Subnet Agent EC2s"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  ingress {
    from_port   = 18789
    to_port     = 18789
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "houston-offmarket-agents-sg" }
}

# 1. Frontend EC2 (Public Subnet)
resource "aws_instance" "frontend" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = "t3.medium"
  subnet_id            = var.public_subnet_1a_id
  vpc_security_group_ids = [aws_security_group.frontend_sg.id]
  iam_instance_profile = var.instance_profile_name
  key_name             = aws_key_pair.deployer.key_name

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io awscli
              systemctl enable --now docker
              sleep 5
              docker run -d --name frontend --restart always -p 3000:3000 ghcr.io/joanroamora/houston-offmarket-frontend:latest || true
              EOF

  tags = { Name = "houston-offmarket-frontend-ec2" }
}

# 2. Scout Agent EC2 (Private Subnet 1a)
resource "aws_instance" "scout" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = "t3.large"
  subnet_id            = var.private_app_subnet_1a_id
  vpc_security_group_ids = [aws_security_group.agents_sg.id]
  iam_instance_profile = var.instance_profile_name
  key_name             = aws_key_pair.deployer.key_name

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io awscli
              systemctl enable --now docker
              sleep 5
              docker run -d --name scout --restart always ghcr.io/joanroamora/houston-offmarket-scout:latest || true
              EOF

  tags = { Name = "houston-offmarket-scout-ec2" }
}

# 3. Enricher Agent EC2 (Private Subnet 1b)
resource "aws_instance" "enricher" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = "t3.xlarge"
  subnet_id            = var.private_app_subnet_1b_id
  vpc_security_group_ids = [aws_security_group.agents_sg.id]
  iam_instance_profile = var.instance_profile_name
  key_name             = aws_key_pair.deployer.key_name

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io awscli
              systemctl enable --now docker
              sleep 5
              docker run -d --name enricher --restart always ghcr.io/joanroamora/houston-offmarket-enricher:latest || true
              EOF

  tags = { Name = "houston-offmarket-enricher-ec2" }
}

# 4. Outreach & API EC2 (Private Subnet 1a)
resource "aws_instance" "outreach" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = "t3.medium"
  subnet_id            = var.private_app_subnet_1a_id
  vpc_security_group_ids = [aws_security_group.agents_sg.id]
  iam_instance_profile = var.instance_profile_name
  key_name             = aws_key_pair.deployer.key_name

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io awscli
              systemctl enable --now docker
              sleep 5
              docker run -d --name api --restart always -p 8000:8000 ghcr.io/joanroamora/houston-offmarket-api:latest || true
              docker run -d --name outreach --restart always ghcr.io/joanroamora/houston-offmarket-outreach:latest || true
              EOF

  tags = { Name = "houston-offmarket-outreach-ec2" }
}

output "frontend_public_ip" { value = aws_instance.frontend.public_ip }
output "frontend_instance_id" { value = aws_instance.frontend.id }
output "scout_private_ip" { value = aws_instance.scout.private_ip }
output "scout_instance_id" { value = aws_instance.scout.id }
output "enricher_private_ip" { value = aws_instance.enricher.private_ip }
output "enricher_instance_id" { value = aws_instance.enricher.id }
output "outreach_private_ip" { value = aws_instance.outreach.private_ip }
output "outreach_instance_id" { value = aws_instance.outreach.id }
