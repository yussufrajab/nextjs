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

-- 5. Migrate existing data to encrypted columns
-- This is run as part of the migration; in production with large tables,
-- consider batching this in a separate maintenance window.
UPDATE "Employee" SET
  "zanIdEncrypted" = encrypt_pii("zanId"),
  "phoneNumberEncrypted" = encrypt_pii("phoneNumber"),
  "emailEncrypted" = encrypt_pii("email"),
  "dateOfBirthEncrypted" = encrypt_pii("dateOfBirth"),
  "zssfNumberEncrypted" = encrypt_pii("zssfNumber"),
  "payrollNumberEncrypted" = encrypt_pii("payrollNumber"),
  "contactAddressEncrypted" = encrypt_pii("contactAddress")
WHERE "zanIdEncrypted" IS NULL;
