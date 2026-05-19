variable "environment" {
  description = "The environment name"
  type        = string
}

variable "s3_bucket_id" {
  description = "The ID of the S3 bucket"
  type        = string
}

variable "s3_bucket_arn" {
  description = "The ARN of the S3 bucket"
  type        = string
}

variable "s3_domain_name" {
  description = "The regional domain name of the S3 bucket"
  type        = string
}



variable "domain_name" {
  description = "The custom domain name (e.g. toolbase.yourdomain.com)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "The ACM certificate ARN for the custom domain (must be in us-east-1)"
  type        = string
  default     = ""
}

variable "use_custom_domain" {
  description = "Whether to use a custom domain name"
  type        = bool
  default     = false
}
