output "alb_dns_name" {
  description = "ALB DNS name (point your domain CNAME here)"
  value       = aws_lb.main.dns_name
}

output "rds_endpoint" {
  description = "PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "cloudfront_domain" {
  description = "CloudFront CDN domain for S3 assets"
  value       = aws_cloudfront_distribution.assets.domain_name
}

output "s3_assets_bucket" {
  description = "S3 bucket name for user assets"
  value       = aws_s3_bucket.assets.bucket
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}
