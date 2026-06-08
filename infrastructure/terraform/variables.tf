variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'."
  }
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "lunara"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "api_image_uri" {
  description = "ECR image URI for the API service"
  type        = string
}

variable "ai_image_uri" {
  description = "ECR image URI for the AI service"
  type        = string
}

variable "admin_image_uri" {
  description = "ECR image URI for the Admin panel"
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI API key (stored in SSM)"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}
