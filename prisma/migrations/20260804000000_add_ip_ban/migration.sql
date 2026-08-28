-- IP Ban on Abuse: persistent record of source IPs auto-banned for auth abuse
-- (failed logins across accounts OR repeated auth 429s) or manually banned by
-- an admin. Counters live in Redis; this table is the durable ban record + the
-- source for the hard gate that blocks a banned IP before the DB user lookup.
-- See docs/superpowers/specs/2026-08-04-ip-ban-design.md.

CREATE TABLE "IpBan" (
  "id"                TEXT              NOT NULL,
  "ipAddress"         TEXT              NOT NULL,
  "banCount"          INTEGER           NOT NULL DEFAULT 0,
  "banType"           TEXT,
  "bannedUntil"       TIMESTAMP(3),
  "banReason"         TEXT,
  "isManuallyBanned"  BOOLEAN           NOT NULL DEFAULT false,
  "bannedBy"          TEXT,
  "bannedAt"          TIMESTAMP(3),
  "banNotes"          TEXT,
  "isActive"          BOOLEAN           NOT NULL DEFAULT true,
  "createdAt"         TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)      NOT NULL,

  CONSTRAINT "IpBan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IpBan_ipAddress_key" ON "IpBan"("ipAddress");
CREATE INDEX "IpBan_ipAddress_isActive_idx" ON "IpBan"("ipAddress", "isActive");
CREATE INDEX "IpBan_bannedUntil_idx" ON "IpBan"("bannedUntil");