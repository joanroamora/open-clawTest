module "vpc" {
  source      = "./modules/vpc"
  vpc_cidr    = var.vpc_cidr
  environment = var.environment
}

module "s3" {
  source      = "./modules/s3"
  environment = var.environment
}

module "iam" {
  source               = "./modules/iam"
  environment          = var.environment
  raw_bucket_arn       = module.s3.raw_bucket_arn
  enriched_bucket_arn  = module.s3.enriched_bucket_arn
  reports_bucket_arn   = module.s3.reports_bucket_arn
}

module "ec2" {
  source                    = "./modules/ec2"
  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  public_subnet_1a_id       = module.vpc.public_subnet_1a_id
  private_app_subnet_1a_id  = module.vpc.private_app_subnet_1a_id
  private_app_subnet_1b_id  = module.vpc.private_app_subnet_1b_id
  instance_profile_name     = module.iam.instance_profile_name
  admin_ip_cidr             = var.admin_ip_cidr
}

module "rds" {
  source                  = "./modules/rds"
  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  private_data_subnet_ids = [module.vpc.private_data_subnet_1a_id, module.vpc.private_data_subnet_1b_id]
  app_subnet_cidrs        = ["10.0.10.0/24", "10.0.11.0/24"]
  db_password             = var.db_password
}

module "elasticache" {
  source                  = "./modules/elasticache"
  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  private_data_subnet_ids = [module.vpc.private_data_subnet_1a_id, module.vpc.private_data_subnet_1b_id]
  app_subnet_cidrs        = ["10.0.10.0/24", "10.0.11.0/24"]
}

module "secrets" {
  source             = "./modules/secrets"
  environment        = var.environment
  gemini_api_key     = var.gemini_api_key
  rentcast_api_key   = var.rentcast_api_key
  batchleads_api_key = var.batchleads_api_key
}

module "alb" {
  source               = "./modules/alb"
  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  public_subnet_ids    = [module.vpc.public_subnet_1a_id, module.vpc.public_subnet_1b_id]
  frontend_instance_id = module.ec2.frontend_instance_id
  outreach_instance_id = module.ec2.outreach_instance_id
}
