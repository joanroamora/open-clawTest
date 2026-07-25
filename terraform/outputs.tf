output "vpc_id" {
  value = module.vpc.vpc_id
}

output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "frontend_public_ip" {
  value = module.ec2.frontend_public_ip
}

output "scout_private_ip" {
  value = module.ec2.scout_private_ip
}

output "enricher_private_ip" {
  value = module.ec2.enricher_private_ip
}

output "outreach_private_ip" {
  value = module.ec2.outreach_private_ip
}

output "rds_endpoint" {
  value = module.rds.rds_endpoint
}

output "redis_endpoint" {
  value = module.elasticache.redis_endpoint
}

output "s3_raw_bucket" {
  value = module.s3.raw_bucket_name
}

output "s3_enriched_bucket" {
  value = module.s3.enriched_bucket_name
}

output "s3_reports_bucket" {
  value = module.s3.reports_bucket_name
}
