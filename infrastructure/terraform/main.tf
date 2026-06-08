terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket  = "lunara-terraform-state"
    key     = "production/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "Lunara"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

# ─── Data sources ─────────────────────────────────────────────────────────────
data "aws_availability_zones" "available" { state = "available" }
data "aws_caller_identity" "current" {}
