output "api_endpoint" {
  description = "The invoke URL of the API Gateway proxy endpoint"
  value       = aws_apigatewayv2_stage.default.invoke_url
}
