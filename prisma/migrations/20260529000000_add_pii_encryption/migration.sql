-- Migration: Add PII encryption support
-- Adds encrypted columns for sensitive employee PII fields
-- and a helper function for application-level encryption.

-- 1. Enable pgcrypto extension (required for encryption functions)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add encrypted columns for sensitive PII fields
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "zanIdEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "phoneNumberEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "emailEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "dateOfBirthEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "zssfNumberEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "payrollNumberEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "contactAddressEncrypted" TEXT;

-- 3. Create encryption function (AES-256 via pgp_sym_encrypt)
-- The encryption key is passed via the app.encryption_key runtime setting.
-- Set it per-session with: SELECT set_config('app.encryption_key', '<key>', false);
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext text) RETURNS text AS $$
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(
    pgp_sym_encrypt(
      plaintext,
      current_setting('app.encryption_key')
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create decryption function
CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext text) RETURNS text AS $$
BEGIN
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(
    decode(ciphertext, 'base64'),
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Migrate existing data to encrypted columns.
-- Guard for fresh/changed databases: only encrypt a PII field when its source
-- plaintext column still exists on "Employee" (e.g. "email" is not an Employee
-- column in the current schema, so it is skipped). This keeps the migration
-- idempotent across schema versions.
DO $$
DECLARE
  sets text[] := ARRAY[]::text[];
  set_clause text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'zanId') THEN
    sets := array_append(sets, '"zanIdEncrypted" = encrypt_pii("zanId"::text)');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'phoneNumber') THEN
    sets := array_append(sets, '"phoneNumberEncrypted" = encrypt_pii("phoneNumber"::text)');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'email') THEN
    sets := array_append(sets, '"emailEncrypted" = encrypt_pii("email"::text)');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'dateOfBirth') THEN
    sets := array_append(sets, '"dateOfBirthEncrypted" = encrypt_pii("dateOfBirth"::text)');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'zssfNumber') THEN
    sets := array_append(sets, '"zssfNumberEncrypted" = encrypt_pii("zssfNumber"::text)');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'payrollNumber') THEN
    sets := array_append(sets, '"payrollNumberEncrypted" = encrypt_pii("payrollNumber"::text)');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'contactAddress') THEN
    sets := array_append(sets, '"contactAddressEncrypted" = encrypt_pii("contactAddress"::text)');
  END IF;

  IF array_length(sets, 1) IS NOT NULL THEN
    set_clause := array_to_string(sets, ', ');
    EXECUTE format('UPDATE "Employee" SET %s WHERE "zanIdEncrypted" IS NULL', set_clause);
  END IF;
END
$$;
