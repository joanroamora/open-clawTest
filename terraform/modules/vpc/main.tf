variable "vpc_cidr" { type = string }
variable "environment" { type = string }

data "aws_availability_zones" "available" {
  state = "available"
}

# Look up Default VPC to bypass AWS VPC quota (5 max per region) and EIP limits
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

output "vpc_id" { value = data.aws_vpc.default.id }
output "public_subnet_1a_id" { value = data.aws_subnets.default.ids[0] }
output "public_subnet_1b_id" { value = length(data.aws_subnets.default.ids) > 1 ? data.aws_subnets.default.ids[1] : data.aws_subnets.default.ids[0] }
output "private_app_subnet_1a_id" { value = data.aws_subnets.default.ids[0] }
output "private_app_subnet_1b_id" { value = length(data.aws_subnets.default.ids) > 1 ? data.aws_subnets.default.ids[1] : data.aws_subnets.default.ids[0] }
output "private_data_subnet_1a_id" { value = data.aws_subnets.default.ids[0] }
output "private_data_subnet_1b_id" { value = length(data.aws_subnets.default.ids) > 1 ? data.aws_subnets.default.ids[1] : data.aws_subnets.default.ids[0] }
