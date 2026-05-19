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
  value       = module.s3.bucket_name
}

