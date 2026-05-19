resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "toolbase-oac-${var.environment}"
  description                       = "OAC for Toolbase static website bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront response headers policy: Injects COOP/COEP headers required for Pyodide and Web Workers
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "toolbase-security-headers-${var.environment}"
  comment = "Injects COOP/COEP headers for Pyodide and Web Workers"

  custom_headers_config {
    items {
      header   = "Cross-Origin-Opener-Policy"
      value    = "same-origin"
      override = true
    }
    items {
      header   = "Cross-Origin-Embedder-Policy"
      value    = "require-corp"
      override = true
    }
    items {
      header   = "Cross-Origin-Resource-Policy"
      value    = "cross-origin"
      override = true
    }
  }

  security_headers_config {
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    content_type_options {
      override = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = var.use_custom_domain ? [var.domain_name] : []

  # S3 Static Website Origin
  origin {
    domain_name              = var.s3_domain_name
    origin_id                = "S3-Website"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  # API Gateway Proxy Origin (strip https:// and trailing /)
  origin {
    domain_name = replace(var.api_invoke_url, "/^https?:\\/\\/|\\/$/", "")
    origin_id   = "APIGateway"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default Cache Behavior (S3 frontend)
  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "S3-Website"
    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Route API behaviors to API Gateway
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "APIGateway"

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
      headers = ["Accept", "Authorization", "Content-Type", "Origin"]
    }

    # API calls shouldn't cache heavily on CDN
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Fallback error responses (standard for SPA / client-routed apps)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  viewer_certificate {
    acm_certificate_arn            = var.use_custom_domain ? var.acm_certificate_arn : null
    ssl_support_method             = var.use_custom_domain ? "sni-only" : null
    minimum_protocol_version       = var.use_custom_domain ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = !var.use_custom_domain
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name        = "toolbase-cdn-${var.environment}"
    Environment = var.environment
  }
}

# Attach IAM policy to the S3 bucket allowing access only via CloudFront OAC
resource "aws_s3_bucket_policy" "frontend" {
  bucket = var.s3_bucket_id
  policy = data.aws_iam_policy_document.s3_policy.json
}

data "aws_iam_policy_document" "s3_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${var.s3_bucket_arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cdn.arn]
    }
  }
}
