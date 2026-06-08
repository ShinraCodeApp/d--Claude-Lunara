-- Lunara PostgreSQL Initialization
-- Enables required extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Create separate schema for audit logs
CREATE SCHEMA IF NOT EXISTS audit;

COMMENT ON DATABASE lunara_dev IS 'Lunara by ShinraCode - Women Health Platform (Development)';
