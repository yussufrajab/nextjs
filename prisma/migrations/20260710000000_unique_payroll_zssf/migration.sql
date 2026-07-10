-- Q13 (Domains 6.2, 6.4): enforce DB-level uniqueness for payrollNumber and
-- zssfNumber on Employee. Previously uniqueness was checked only at the
-- application layer, so concurrent creates could introduce duplicates.
--
-- Both columns are nullable. PostgreSQL unique constraints allow multiple
-- NULLs, so existing blank rows are unaffected. The only blocker for adding
-- the constraint would be duplicate NON-NULL values, so each column is
-- de-duplicated first: among rows sharing a value, keep one (the row with the
-- lexicographically smallest id) and NULL out the rest. This is a one-way,
-- lossy cleanup — duplicated values that are discarded are set to NULL rather
-- than re-assigned, which is the safe choice for identifier columns whose
-- ownership is ambiguous.
--
-- Idempotent: re-running is safe (no-op once constraints exist), but Prisma
-- marks migrations as applied in the _prisma_migrations table, so this normally
-- runs once.

-- 1) De-duplicate payrollNumber (keep smallest id per value, NULL the rest).
UPDATE "Employee" SET "payrollNumber" = NULL
WHERE "payrollNumber" IS NOT NULL
  AND id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY "payrollNumber" ORDER BY id
      ) AS rn
      FROM "Employee"
      WHERE "payrollNumber" IS NOT NULL
    ) t
    WHERE t.rn = 1
  );

-- 2) Add the unique constraint on payrollNumber.
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_payrollNumber_key" ON "Employee"("payrollNumber");

-- 3) De-duplicate zssfNumber (keep smallest id per value, NULL the rest).
UPDATE "Employee" SET "zssfNumber" = NULL
WHERE "zssfNumber" IS NOT NULL
  AND id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY "zssfNumber" ORDER BY id
      ) AS rn
      FROM "Employee"
      WHERE "zssfNumber" IS NOT NULL
    ) t
    WHERE t.rn = 1
  );

-- 4) Add the unique constraint on zssfNumber.
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_zssfNumber_key" ON "Employee"("zssfNumber");