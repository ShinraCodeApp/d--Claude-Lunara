resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.app_name}-${var.environment}-redis"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "redis" {
  name   = "${var.app_name}-${var.environment}-redis-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.app_name}-${var.environment}-redis"
  description          = "Lunara Redis cluster"
  node_type            = var.environment == "production" ? "cache.t3.small" : "cache.t3.micro"
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auto_minor_version_upgrade = true
}
