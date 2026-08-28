## Task 1: Prisma `IpBan` model + migration

**Files:**
- Modify: `prisma/schema.prisma` (append `IpBan` model after `PasswordResetToken`, ~line 545)
- Create: `prisma/migrations/20260804000000_add_ip_ban/migration.sql`

**Interfaces:**
- Produces: `db.ipBan` (Prisma model delegate) with `findUnique`, `findMany`, `upsert`, `update`, `updateMany`, `create` — consumed by all later tasks.

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Append after the `PasswordResetToken` model (after line ~534, before the end of file / next model). Use the compact column alignment style from `MfaToken` (lines 515-533):

```prisma
model IpBan {
  id                String    @id @default(cuid())
  ipAddress         String    @unique
  banCount          Int       @default(0)
  banType           String?
  bannedUntil       DateTime?
  banReason         String?
  isManuallyBanned  Boolean   @default(false)
  bannedBy          String?
  bannedAt          DateTime?
  banNotes          String?
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([ipAddress, isActive])
  @@index([bannedUntil])
}
```

- [ ] **Step 2: Create the migration SQL**

Create `prisma/migrations/20260804000000_add_ip_ban/migration.sql`:

```sql
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
```

- [ ] **Step 3: Generate the Prisma client and apply the migration**

Run:
```bash
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
```
Expected: `generate` reports `✔ Generated Prisma Client`; `migrate deploy` reports `1 migration applied`; `migrate status` reports `Database schema is up to date`.

- [ ] **Step 4: Verify the model delegate exists**

Run:
```bash
node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); console.log(typeof p.ipBan.create, typeof p.ipBan.upsert); p.\$disconnect();"
```
Expected: `function function`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260804000000_add_ip_ban/migration.sql
git commit -m "feat(security): add IpBan Prisma model + migration"
```

---

