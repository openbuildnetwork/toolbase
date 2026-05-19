module "storage" {
  source      = "./modules/storage"
  environment = var.environment
}

module "lambda" {
  source      = "./modules/lambda"
  environment = var.environment
}

module "api" {
  source      = "./modules/api"
  environment = var.environment
  lambda_arn  = module.lambda.lambda_arn
  lambda_name = module.lambda.lambda_name
}

module "cdn" {
  source              = "./modules/cdn"
  environment         = var.environment
  s3_bucket_id        = module.storage.bucket_id
  s3_bucket_arn       = module.storage.bucket_arn
  s3_domain_name      = module.storage.bucket_domain_name
  api_invoke_url      = module.api.api_endpoint
  domain_name         = var.domain_name
  acm_certificate_arn = var.acm_certificate_arn
  use_custom_domain   = var.use_custom_domain
}

# Automatically build the Next.js static files and upload them to S3 on terraform apply
resource "terraform_data" "build_and_upload" {
  triggers_replace = {
    # Force rebuild and upload on every terraform apply
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ../..
      pnpm build
      if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
      aws s3 sync out/ s3://${module.storage.bucket_name}/ --delete
      if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
      aws cloudfront create-invalidation --distribution-id ${module.cdn.cloudfront_distribution_id} --paths '/*'
    EOT
    interpreter = ["powershell", "-Command"]
  }
}
