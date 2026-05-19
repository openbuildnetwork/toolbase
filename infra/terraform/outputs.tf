output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = module.cdn.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution for cache invalidations"
  value       = module.cdn.cloudfront_distribution_id
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket hosting frontend assets"
  value       = module.storage.bucket_name
}

output "api_endpoint" {
  description = "The invoke URL of the API Gateway proxy endpoint"
  value       = module.api.api_endpoint
}
