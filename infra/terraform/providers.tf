terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Provider specifically for ACM certificates, which CloudFront requires to be in us-east-1
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}
