output "lambda_arn" {
  description = "The ARN of the Lambda function"
  value       = aws_lambda_function.proxy_image.arn
}

output "lambda_name" {
  description = "The function name of the Lambda function"
  value       = aws_lambda_function.proxy_image.function_name
}
