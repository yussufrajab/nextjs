-- Step 1: Create the audit schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS audit;

-- Step 2: Create the partitioned parent table audit.audit_log
CREATE TABLE audit.audit_log (
    id BIGSERIAL,
    event_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id TEXT,
    username TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    event_category TEXT NOT NULL DEFAULT 'SYSTEM',
    severity TEXT NOT NULL DEFAULT 'INFO',
    entity_type TEXT NOT NULL DEFAULT 'SYSTEM',
    entity_id TEXT,
    ip_address INET,
    device_info JSONB,
    request_method TEXT,
    request_route TEXT NOT NULL,
    is_authenticated BOOLEAN DEFAULT false,
    was_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    additional_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Step 3: Create indexes on the parent table
CREATE INDEX idx_audit_log_action ON audit.audit_log (action);
CREATE INDEX idx_audit_log_event_category ON audit.audit_log (event_category);
CREATE INDEX idx_audit_log_severity ON audit.audit_log (severity);
CREATE INDEX idx_audit_log_user_id ON audit.audit_log (user_id);
CREATE INDEX idx_audit_log_created_at ON audit.audit_log (created_at);
CREATE INDEX idx_audit_log_request_route ON audit.audit_log (request_route);
CREATE INDEX idx_audit_log_event_id ON audit.audit_log (event_id);

-- Step 4: Create monthly partitions from 2025-11 through 2027-05
CREATE TABLE audit.audit_log_2025_11 PARTITION OF audit.audit_log FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE audit.audit_log_2025_12 PARTITION OF audit.audit_log FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE audit.audit_log_2026_01 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit.audit_log_2026_02 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit.audit_log_2026_03 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE audit.audit_log_2026_04 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit.audit_log_2026_05 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit.audit_log_2026_06 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit.audit_log_2026_07 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE audit.audit_log_2026_08 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE audit.audit_log_2026_09 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE audit.audit_log_2026_10 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE audit.audit_log_2026_11 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE audit.audit_log_2026_12 PARTITION OF audit.audit_log FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE audit.audit_log_2027_01 PARTITION OF audit.audit_log FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE audit.audit_log_2027_02 PARTITION OF audit.audit_log FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE audit.audit_log_2027_03 PARTITION OF audit.audit_log FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
CREATE TABLE audit.audit_log_2027_04 PARTITION OF audit.audit_log FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');
CREATE TABLE audit.audit_log_2027_05 PARTITION OF audit.audit_log FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');

-- Step 5: Migrate existing data from public."AuditLog" to audit.audit_log.
-- Guard for fresh databases: the legacy public."AuditLog" table is no longer
-- created by any earlier migration, so on a fresh deploy there is nothing to
-- migrate. Only run the data migration when the legacy table exists.
DO $$
BEGIN
  IF to_regclass('public."AuditLog"') IS NOT NULL THEN
    INSERT INTO audit.audit_log (
        action, event_category, severity, user_id, username, user_role,
        ip_address, device_info, request_method, request_route,
        is_authenticated, was_blocked, block_reason, additional_data,
        entity_type, created_at
    )
    SELECT
        "eventType",
        "eventCategory",
        "severity",
        "userId",
        "username",
        "userRole",
        CASE WHEN "ipAddress" IS NOT NULL AND "ipAddress" != '' THEN "ipAddress"::inet ELSE NULL END,
        "deviceInfo",
        "requestMethod",
        "attemptedRoute",
        "isAuthenticated",
        "wasBlocked",
        "blockReason",
        "additionalData",
        'SYSTEM',
        "timestamp"
    FROM public."AuditLog";
  END IF;
END
$$;

-- Step 6: Drop the old AuditLog table
DROP TABLE IF EXISTS public."AuditLog";