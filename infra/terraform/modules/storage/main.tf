data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "frontend" {
  bucket = "toolbase-frontend-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "toolbase-frontend-${var.environment}"
    Environment = var.environment
  }
}

# Block all public access. The bucket is purely accessed by CloudFront via OAC.
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Versioning configuration
resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}
