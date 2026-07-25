variable "vpc_id" { type = string }
variable "private_data_subnet_ids" { type = list(string) }
variable "app_subnet_cidrs" { type = list(string) }
variable "environment" { type = string }
variable "name_suffix" { type = string }

resource "aws_elasticache_subnet_group" "redis" {
  name       = "hom-redis-sub-${var.environment}-${var.name_suffix}"
  subnet_ids = var.private_data_subnet_ids
}

resource "aws_security_group" "redis_sg" {
  name        = "houston-offmarket-redis-sg-${var.environment}"
  description = "Allow inbound Redis from App Subnets"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.app_subnet_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "houston-offmarket-redis-sg" }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "houston-offmarket-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis_sg.id]
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}
