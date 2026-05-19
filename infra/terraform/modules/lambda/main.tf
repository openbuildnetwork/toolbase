data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/proxy-image"
  output_path = "${path.module}/proxy_image.zip"
}

resource "aws_lambda_function" "proxy_image" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "toolbase-image-proxy-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30
  memory_size      = 256

  tags = {
    Name        = "toolbase-image-proxy-${var.environment}"
    Environment = var.environment
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "toolbase-lambda-exec-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Attach log policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
