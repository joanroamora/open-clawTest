variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "frontend_instance_id" { type = string }
variable "outreach_instance_id" { type = string }
variable "environment" { type = string }
variable "name_suffix" { type = string }

resource "aws_security_group" "alb_sg" {
  name        = "houston-offmarket-alb-sg-${var.environment}-${var.name_suffix}"
  description = "ALB Security Group allowing HTTP/HTTPS from everywhere"
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

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "alb" {
  name               = "houston-offmarket-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = var.public_subnet_ids
}

# Target Groups
resource "aws_lb_target_group" "frontend" {
  name        = "hom-fe-${var.name_suffix}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    path                = "/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "api" {
  name        = "hom-api-${var.name_suffix}"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    path                = "/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# Attach Instances
resource "aws_lb_target_group_attachment" "frontend_attach" {
  target_group_arn = aws_lb_target_group.frontend.arn
  target_id        = var.frontend_instance_id
  port             = 3000
}

resource "aws_lb_target_group_attachment" "api_attach" {
  target_group_arn = aws_lb_target_group.api.arn
  target_id        = var.outreach_instance_id
  port             = 8000
}

# Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "api_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/reports/*", "/enriched*", "/properties*", "/webhooks/*"]
    }
  }
}

# Basic WAF Web ACL for ALB
resource "aws_wafv2_web_acl" "basic_waf" {
  name        = "houston-offmarket-waf-${var.environment}-${var.name_suffix}"
  description = "Basic WAF rule for ALB protection"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "HoustonOffMarketWaf"
    sampled_requests_enabled   = true
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
}

resource "aws_wafv2_web_acl_association" "alb_waf_assoc" {
  resource_arn = aws_lb.alb.arn
  web_acl_arn  = aws_wafv2_web_acl.basic_waf.arn
}

output "alb_dns_name" {
  value = aws_lb.alb.dns_name
}
