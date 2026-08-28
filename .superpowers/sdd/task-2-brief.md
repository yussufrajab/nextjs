## Task 2: Audit event types

**Files:**
- Modify: `src/lib/audit-logger.ts:20-90` (the `AuditEventType` enum)
- Test: existing `src/lib/audit-logger.test.ts` (append one assertion)

**Interfaces:**
- Produces: `AuditEventType.IP_BANNED`, `IP_BANNED_UPGRADED`, `IP_AUTO_UNBANNED`, `ADMIN_IP_BAN`, `ADMIN_IP_UNBAN` — consumed by `ip-ban-utils.ts` (Tasks 3-5).

- [ ] **Step 1: Write the failing test**

Append to `src/lib/audit-logger.test.ts` (add the import of `AuditEventType` if not already imported in that file; if it is, just add the `describe` block):

```typescript
describe('AuditEventType — IP ban events', () => {
  it('exposes the five IP-ban event types', () => {
    const { AuditEventType } = require('./audit-logger');
    expect(AuditEventType.IP_BANNED).toBe('IP_BANNED');
    expect(AuditEventType.IP_BANNED_UPGRADED).toBe('IP_BANNED_UPGRADED');
    expect(AuditEventType.IP_AUTO_UNBANNED).toBe('IP_AUTO_UNBANNED');
    expect(AuditEventType.ADMIN_IP_BAN).toBe('ADMIN_IP_BAN');
    expect(AuditEventType.ADMIN_IP_UNBAN).toBe('ADMIN_IP_UNBAN');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/audit-logger.test.ts -t "IP ban events"`
Expected: FAIL — `AuditEventType.IP_BANNED` is `undefined`.

- [ ] **Step 3: Add the enum entries**

In `src/lib/audit-logger.ts`, inside the `AuditEventType` enum, add a new section after the `ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',` line (line ~71):

```typescript
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  // IP ban on abuse (auto ban on failed-logins-across-accounts or repeated auth
  // 429s; admin can also ban/unban manually). See ip-ban-utils.ts.
  IP_BANNED = 'IP_BANNED',
  IP_BANNED_UPGRADED = 'IP_BANNED_UPGRADED',
  IP_AUTO_UNBANNED = 'IP_AUTO_UNBANNED',
  ADMIN_IP_BAN = 'ADMIN_IP_BAN',
  ADMIN_IP_UNBAN = 'ADMIN_IP_UNBAN',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/audit-logger.test.ts -t "IP ban events"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/audit-logger.ts src/lib/audit-logger.test.ts
git commit -m "feat(security): add IP ban audit event types"
```

---

