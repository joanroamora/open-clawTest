variable "vpc_cidr" { type = string }
variable "environment" { type = string }

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "houston-offmarket-vpc-${var.environment}"
  }
}

# Public Subnets
resource "aws_subnet" "public_1a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "houston-offmarket-public-1a"
  }
}

resource "aws_subnet" "public_1b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = {
    Name = "houston-offmarket-public-1b"
  }
}

# Private App Subnets
resource "aws_subnet" "private_app_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "houston-offmarket-private-app-1a"
  }
}

resource "aws_subnet" "private_app_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "houston-offmarket-private-app-1b"
  }
}

# Private Data Subnets
resource "aws_subnet" "private_data_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.20.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "houston-offmarket-private-data-1a"
  }
}

resource "aws_subnet" "private_data_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.21.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "houston-offmarket-private-data-1b"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "houston-offmarket-igw"
  }
}

# EIPs for NAT Gateways
resource "aws_eip" "nat_1a" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.igw]
}

resource "aws_eip" "nat_1b" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.igw]
}

# NAT Gateways
resource "aws_nat_gateway" "nat_1a" {
  allocation_id = aws_eip.nat_1a.id
  subnet_id     = aws_subnet.public_1a.id

  tags = {
    Name = "houston-offmarket-nat-1a"
  }
}

resource "aws_nat_gateway" "nat_1b" {
  allocation_id = aws_eip.nat_1b.id
  subnet_id     = aws_subnet.public_1b.id

  tags = {
    Name = "houston-offmarket-nat-1b"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "houston-offmarket-rt-public"
  }
}

resource "aws_route_table" "private_1a" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_1a.id
  }

  tags = {
    Name = "houston-offmarket-rt-private-1a"
  }
}

resource "aws_route_table" "private_1b" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_1b.id
  }

  tags = {
    Name = "houston-offmarket-rt-private-1b"
  }
}

# Associations
resource "aws_route_table_association" "public_1a" {
  subnet_id      = aws_subnet.public_1a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_1b" {
  subnet_id      = aws_subnet.public_1b.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app_1a" {
  subnet_id      = aws_subnet.private_app_1a.id
  route_table_id = aws_route_table.private_1a.id
}

resource "aws_route_table_association" "private_app_1b" {
  subnet_id      = aws_subnet.private_app_1b.id
  route_table_id = aws_route_table.private_1b.id
}

resource "aws_route_table_association" "private_data_1a" {
  subnet_id      = aws_subnet.private_data_1a.id
  route_table_id = aws_route_table.private_1a.id
}

resource "aws_route_table_association" "private_data_1b" {
  subnet_id      = aws_subnet.private_data_1b.id
  route_table_id = aws_route_table.private_1b.id
}

# VPC Gateway Endpoints for S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${data.aws_availability_zones.available.id != "" ? "us-east-1" : "us-east-1"}.s3"
  route_table_ids = [
    aws_route_table.private_1a.id,
    aws_route_table.private_1b.id
  ]
  tags = {
    Name = "houston-offmarket-vpce-s3"
  }
}

output "vpc_id" { value = aws_vpc.main.id }
output "public_subnet_1a_id" { value = aws_subnet.public_1a.id }
output "public_subnet_1b_id" { value = aws_subnet.public_1b.id }
output "private_app_subnet_1a_id" { value = aws_subnet.private_app_1a.id }
output "private_app_subnet_1b_id" { value = aws_subnet.private_app_1b.id }
output "private_data_subnet_1a_id" { value = aws_subnet.private_data_1a.id }
output "private_data_subnet_1b_id" { value = aws_subnet.private_data_1b.id }
