variable "aws_region" {
  description = "Primary AWS region for deploying resources"
  type        = string
  default     = "us-east-1"
}



variable "domain_name" {
  description = "The custom domain name for the application (e.g., toolbase.yourdomain.com)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate located in us-east-1 (required for custom domain CloudFront distribution)"
  type        = string
  default     = ""
}

variable "use_custom_domain" {
  description = "Set to true to configure CloudFront with custom domain name and ACM certificates"
  type        = bool
  default     = false
}
