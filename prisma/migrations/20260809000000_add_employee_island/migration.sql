-- Add Island enum + Employee.island column.
--
-- Work-location island for an employee. Derived from HRIMS work-location
-- fields during sync (see src/lib/island-utils.ts). The column defaults to
-- UNGUJA: every employee is assumed Unguja unless a Pemba signal is present
-- in the institution name, workplace, reporting office, or department —
-- specifically:
--   1. The field literally contains "pemba".
--   2. The field names a Pemba-only district (chake, wete, mkoani, micheweni).
--   3. The field is "Ofisi Kuu Pemba".
--   4. The field contains "uratibu" (coordination offices are Pemba field
--      offices in this dataset).
--
-- The backfill below applies that same keyword logic to all existing rows.
-- Rows with no Pemba signal keep the UNGUJA default — there is no PENDING
-- state; the assumption is documented in the schema and deriveIsland().

-- 1) Create the enum type.
CREATE TYPE "Island" AS ENUM ('PEMBA', 'UNGUJA');

-- 2) Add the column with the Unguja default.
ALTER TABLE "Employee" ADD COLUMN "island" "Island" NOT NULL DEFAULT 'UNGUJA';

-- 3) Backfill: set PEMBA where any work-location field carries a Pemba signal.
--    Everything else remains UNGUJA (the column default above).
UPDATE "Employee" SET "island" = 'PEMBA'
WHERE "department" ILIKE '%pemba%'
   OR "department" ILIKE '%chake%'
   OR "department" ILIKE '%wete%'
   OR "department" ILIKE '%mkoani%'
   OR "department" ILIKE '%micheweni%'
   OR "department" ILIKE '%uratibu%'
   OR "currentWorkplace" ILIKE '%pemba%'
   OR "currentWorkplace" ILIKE '%chake%'
   OR "currentWorkplace" ILIKE '%wete%'
   OR "currentWorkplace" ILIKE '%mkoani%'
   OR "currentWorkplace" ILIKE '%micheweni%'
   OR "currentWorkplace" ILIKE '%uratibu%'
   OR "currentReportingOffice" ILIKE '%pemba%'
   OR "currentReportingOffice" ILIKE '%chake%'
   OR "currentReportingOffice" ILIKE '%wete%'
   OR "currentReportingOffice" ILIKE '%mkoani%'
   OR "currentReportingOffice" ILIKE '%micheweni%'
   OR "currentReportingOffice" ILIKE '%uratibu%';

-- 4) Index the column so `WHERE island = 'PEMBA'` is an exact, indexed lookup
--    instead of the previous `department ILIKE '%pemba%'` full scan.
CREATE INDEX "Employee_island_idx" ON "Employee"("island");