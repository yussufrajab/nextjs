-- Req 9.6 (Confidential information protection — complainant identity):
-- add a `confidential` flag to Complaint. When true, the API redacts the
-- complainant's identity PII (employeeId, employeeName, zanId, phone numbers)
-- for everyone except the complainant themselves and the exactly-assigned
-- handling officer (DO/HHRMD). Harassment ("Unyanyasaji") complaints are
-- marked confidential by the API on creation.
--
-- Boolean NOT NULL DEFAULT false — existing rows are treated as non-confidential,
-- preserving current visibility (no behavior change for legacy complaints).

ALTER TABLE "Complaint" ADD COLUMN "confidential" BOOLEAN NOT NULL DEFAULT false;