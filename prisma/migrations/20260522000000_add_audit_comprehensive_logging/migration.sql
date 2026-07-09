-- AlterTable: Replace `userAgent` column with `deviceInfo` (Json type)
-- and change `wasBlocked` default from true to false.
--
-- Guard for fresh databases: the legacy public."AuditLog" table is no longer
-- created by any migration in the history (it was superseded by the partitioned
-- audit.audit_log table). On a fresh deploy this ALTER has nothing to act on, so
-- skip it when the table is absent. Existing databases that still have the
-- legacy table are altered as originally intended.
DO $$
BEGIN
  IF to_regclass('public."AuditLog"') IS NOT NULL THEN
    ALTER TABLE "AuditLog" DROP COLUMN "userAgent";
    ALTER TABLE "AuditLog" ADD COLUMN "deviceInfo" Json;
    ALTER TABLE "AuditLog" ALTER COLUMN "wasBlocked" SET DEFAULT false;
  END IF;
END
$$;