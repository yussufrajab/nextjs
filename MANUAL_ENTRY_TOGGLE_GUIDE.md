# Manual Entry Toggle - Admin UI Guide

## Overview

Admins can now enable/disable manual employee entry for institutions directly from the Admin UI.

## Location

Navigate to: **Dashboard → Admin → Institution Management**

Or visit: `https://csms.zanajira.go.tz/dashboard/admin/institutions`

## Features

### 1. View Manual Entry Status

The institutions table now shows a "Manual Entry" column with color-coded badges:

- 🟢 **Active** (Green) - Manual entry is enabled and currently within the time window
- 🟡 **Enabled** (Yellow) - Manual entry is enabled but outside the time window
- ❌ **Disabled** (Gray) - Manual entry is disabled

### 2. Enable/Disable Manual Entry

When creating or editing an institution:

1. Click the "Add New Institution" button or the Edit icon on an existing institution
2. Scroll down to the **Manual Employee Entry Permission** section
3. Toggle the "Enable Manual Entry" switch
4. When enabled, two date fields appear:
   - **Start Date** - When manual entry becomes active
   - **End Date** - When manual entry expires

### 3. Time Window Logic

For the "Add Employee" menu to appear for HRO users:

1. ✅ Manual entry must be **enabled** for their institution
2. ✅ Current date must be between **Start Date** and **End Date**
3. ✅ User must be an **HRO** role

If any of these conditions are not met, the "Add Employee" menu item will not appear.

## Quick Actions

### Enable Manual Entry for All Institutions

Run this script to enable manual entry for all institutions (1 year duration):

```bash
npx tsx scripts/enable-all-manual-entry.ts
```

### Enable Manual Entry for Specific Institution

Run this script with the institution ID:

```bash
npx tsx scripts/enable-manual-entry.ts <institutionId>
```

### List All Institutions with Status

View all institutions and their manual entry status:

```bash
npx tsx scripts/list-institutions.ts
```

## How It Works

### For HRO Users

1. Admin enables manual entry for their institution via the Admin UI
2. Admin sets a valid time window (Start Date → End Date)
3. HRO users from that institution will see "Add Employee" in the sidebar menu
4. They need to refresh their browser (Ctrl+Shift+R) to see the change

### For Admin Users

Admins can:
- View all institutions and their manual entry status at a glance
- Enable/disable manual entry with a simple toggle
- Set custom time windows for each institution
- Edit time windows at any time

## API Changes

The following API endpoints now support manual entry fields:

- `GET /api/institutions` - Returns manual entry status for all institutions
- `POST /api/institutions` - Create institution with manual entry settings
- `PUT /api/institutions/[id]` - Update institution manual entry settings
- `GET /api/institutions/[id]/manual-entry-permission` - Check if institution has permission

## Database Fields

Three new fields have been added to the Institution model:

```typescript
manualEntryEnabled: boolean      // Toggle on/off
manualEntryStartDate: DateTime   // When it becomes active
manualEntryEndDate: DateTime     // When it expires
```

## Export Functionality

The PDF and Excel export now include the Manual Entry status column showing:
- "Enabled" - Manual entry is enabled
- "Disabled" - Manual entry is disabled

## Troubleshooting

### "Add Employee" menu not appearing

Check these conditions:
1. ✅ Manual entry enabled for the institution?
2. ✅ Current date within start/end date range?
3. ✅ User role is HRO?
4. ✅ User refreshed browser (Ctrl+Shift+R)?

### Verify institution settings

```bash
# List all institutions and their status
npx tsx scripts/list-institutions.ts

# Check specific institution in database
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p = new PrismaClient(); p.institution.findUnique({where:{id:'INSTITUTION_ID'}}).then(console.log)"
```

## Example Usage

### Setting up a 6-month trial period

1. Go to Institution Management
2. Edit the institution
3. Enable "Manual Entry"
4. Set Start Date: `2026-01-30 00:00`
5. Set End Date: `2026-07-30 23:59`
6. Click "Save"

### Extending an existing period

1. Edit the institution
2. Update the End Date to a later date
3. Click "Save"

### Disabling manual entry immediately

1. Edit the institution
2. Toggle "Enable Manual Entry" to OFF
3. Click "Save"

HRO users will lose access immediately (after refreshing their browser).

## Related Files

- **Frontend**: `src/app/dashboard/admin/institutions/page.tsx`
- **Backend**:
  - `src/app/api/institutions/route.ts` (GET, POST)
  - `src/app/api/institutions/[id]/route.ts` (PUT)
  - `src/app/api/institutions/[id]/manual-entry-permission/route.ts`
- **Scripts**:
  - `scripts/enable-manual-entry.ts`
  - `scripts/enable-all-manual-entry.ts`
  - `scripts/list-institutions.ts`

## Security Notes

- Only users with **Admin** role can access the Institution Management page
- Only users with **Admin** role can modify manual entry settings
- HRO users can only see "Add Employee" if their institution has permission
- All API endpoints check authentication and authorization

## Next Steps

After deployment:
1. Clear nginx cache: `rm -rf /www/server/nginx/proxy_cache_dir/*`
2. Reload nginx: `/www/server/nginx/sbin/nginx -s reload`
3. Restart PM2: `pm2 restart production`
4. Users should clear browser cache (Ctrl+Shift+R)

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs production`
2. Check browser console for errors
3. Verify database connection
4. Ensure institution has correct manual entry settings
