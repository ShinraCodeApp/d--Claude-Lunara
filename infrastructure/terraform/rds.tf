resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-${var.environment}-db"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "rds" {
  name   = "${var.app_name}-${var.environment}-rds-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
}

resource "aws_db_instance" "postgres" {
  identifier           = "${var.app_name}-${var.environment}-postgres"
  engine               = "postgres"
  engine_version       = "16.2"
  instance_class       = var.environment == "production" ? "db.t3.medium" : "db.t3.micro"
  allocated_storage    = var.environment == "production" ? 100 : 20
  storage_encrypted    = true
  db_name              = "lunara"
  username             = "lunara_admin"
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period   = var.environment == "production" ? 7 : 1
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.app_name}-final-snapshot" : null
  deletion_protection       = var.environment == "production"

  multi_az = var.environment == "production"

  parameter_group_name = aws_db_parameter_group.postgres.name
}

resource "aws_db_parameter_group" "postgres" {
  name   = "${var.app_name}-${var.environment}-pg16"
  family = "postgres16"

  parameter {
    name  = "log_connections"
    value = "1"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
}
