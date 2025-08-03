# Dependency Analysis Report - Next.js Studio Project

## 1. Exact Dependency Versions

### package-lock.json (first 50 lines)
```json
{
  "name": "nextn",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "nextn",
      "version": "0.1.0",
      "hasInstallScript": true,
      "dependencies": {
        "@genkit-ai/googleai": "^1.8.0",
        "@genkit-ai/next": "^1.8.0",
        "@hookform/resolvers": "^4.1.3",
        "@prisma/client": "^6.11.1",
        "@radix-ui/react-accordion": "^1.2.3",
        "@radix-ui/react-alert-dialog": "^1.1.6",
        "@radix-ui/react-avatar": "^1.1.3",
        "@radix-ui/react-checkbox": "^1.1.4",
        "@radix-ui/react-dialog": "^1.1.6",
        "@radix-ui/react-dropdown-menu": "^2.1.6",
        "@radix-ui/react-label": "^2.1.2",
        "@radix-ui/react-menubar": "^1.1.6",
        "@radix-ui/react-popover": "^1.1.6",
        "@radix-ui/react-progress": "^1.1.2",
        "@radix-ui/react-radio-group": "^1.2.3",
        "@radix-ui/react-scroll-area": "^1.2.3",
        "@radix-ui/react-select": "^2.1.6",
        "@radix-ui/react-separator": "^1.1.2",
        "@radix-ui/react-slider": "^1.2.3",
        "@radix-ui/react-slot": "^1.1.2",
        "@radix-ui/react-switch": "^1.1.3",
        "@radix-ui/react-tabs": "^1.1.3",
        "@radix-ui/react-toast": "^1.2.6",
        "@radix-ui/react-tooltip": "^1.1.8",
        "bcryptjs": "^2.4.3",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "date-fns": "^3.6.0",
        "dotenv": "^16.5.0",
        "firebase": "^11.8.1",
        "genkit": "^1.8.0",
        "jspdf": "^2.5.1",
        "jspdf-autotable": "^3.8.2",
        "lucide-react": "^0.475.0",
        "node-fetch": "^2.7.0",
        "patch-package": "^8.0.0",
        "react-day-picker": "^8.10.1",
        "react-hook-form": "^7.54.2",
        "recharts": "^2.15.1",
```

### npm list --depth=0
```
nextn@0.1.0 /mnt/c/hamisho/studio
├── @genkit-ai/googleai@1.8.0
├── @genkit-ai/next@1.8.0
├── @hookform/resolvers@4.1.3
├── @prisma/client@6.11.1
├── @radix-ui/react-accordion@1.2.3
├── @radix-ui/react-alert-dialog@1.1.6
├── @radix-ui/react-avatar@1.1.3
├── @radix-ui/react-checkbox@1.1.4
├── @radix-ui/react-dialog@1.1.6
├── @radix-ui/react-dropdown-menu@2.1.6
├── @radix-ui/react-label@2.1.2
├── @radix-ui/react-menubar@1.1.6
├── @radix-ui/react-popover@1.1.6
├── @radix-ui/react-progress@1.1.2
├── @radix-ui/react-radio-group@1.2.3
├── @radix-ui/react-scroll-area@1.2.3
├── @radix-ui/react-select@2.1.6
├── @radix-ui/react-separator@1.1.2
├── @radix-ui/react-slider@1.2.3
├── @radix-ui/react-slot@1.1.2
├── @radix-ui/react-switch@1.1.3
├── @radix-ui/react-tabs@1.1.3
├── @radix-ui/react-toast@1.2.6
├── @radix-ui/react-tooltip@1.1.8
├── @types/bcryptjs@2.4.6
├── @types/jspdf@2.0.0
├── @types/node@20.17.17
├── @types/react-dom@18.3.5
├── @types/react@18.3.18
├── bcryptjs@2.4.3
├── class-variance-authority@0.7.1
├── clsx@2.1.1
├── date-fns@3.6.0
├── dotenv@16.5.0
├── firebase@11.8.1
├── genkit-cli@1.8.0
├── genkit@1.8.0
├── jspdf-autotable@3.8.4
├── jspdf@2.5.2
├── lucide-react@0.475.0
├── node-fetch@2.7.0
├── patch-package@8.0.0
├── postcss@8.5.2
├── prisma@6.11.1
├── react-day-picker@8.10.1
├── react-hook-form@7.54.2
├── recharts@2.15.1
├── tailwind-merge@3.0.1
├── tailwindcss-animate@1.0.7
├── tailwindcss@3.4.17
├── tsx@4.19.4
├── typescript@5.7.3
├── xlsx@0.18.5
├── zod@3.24.2
└── zustand@4.5.7
```

## 2. Node.js Environment Info

### Node.js version
```
v22.17.0
```

### npm version
```
10.9.2
```

### Node.js path
```
/usr/bin/node
```

### npm path
```
/usr/bin/npm
```

## 3. Working Build Artifacts

### .next/ directory listing
```
total 272
drwxrwxrwx 1 yusuf yusuf   4096 Jul 14 04:36 .
drwxrwxrwx 1 yusuf yusuf   4096 Jul 14 04:37 ..
-rwxrwxrwx 1 yusuf yusuf     21 Jul 14 04:35 BUILD_ID
-rwxrwxrwx 1 yusuf yusuf  25056 Jul 14 04:35 app-build-manifest.json
-rwxrwxrwx 1 yusuf yusuf   2802 Jul 14 04:35 app-path-routes-manifest.json
-rwxrwxrwx 1 yusuf yusuf    996 Jul 14 04:35 build-manifest.json
drwxrwxrwx 1 yusuf yusuf   4096 Jul 13 03:23 cache
drwxrwxrwx 1 yusuf yusuf   4096 Jul 14 04:34 diagnostics
-rwxrwxrwx 1 yusuf yusuf    111 Jul 14 04:35 export-marker.json
-rwxrwxrwx 1 yusuf yusuf   1082 Jul 14 04:35 images-manifest.json
-rwxrwxrwx 1 yusuf yusuf  11406 Jul 14 04:36 next-minimal-server.js.nft.json
-rwxrwxrwx 1 yusuf yusuf  56009 Jul 14 04:36 next-server.js.nft.json
-rwxrwxrwx 1 yusuf yusuf     20 Jul 14 04:34 package.json
-rwxrwxrwx 1 yusuf yusuf  14662 Jul 14 04:35 prerender-manifest.json
-rwxrwxrwx 1 yusuf yusuf    515 Jul 14 04:35 react-loadable-manifest.json
-rwxrwxrwx 1 yusuf yusuf   8612 Jul 14 04:35 required-server-files.json
-rwxrwxrwx 1 yusuf yusuf   7389 Jul 14 04:35 routes-manifest.json
drwxrwxrwx 1 yusuf yusuf   4096 Jul 14 04:35 server
drwxrwxrwx 1 yusuf yusuf   4096 Jul 14 04:35 static
-rwxrwxrwx 1 yusuf yusuf 131028 Jul 14 04:36 trace
drwxrwxrwx 1 yusuf yusuf   4096 Jul 14 04:34 types
```

### .next/BUILD_ID
```
BKLUtdX9tqN6pI2v-4GRJ
```

## 4. Dependency Snapshot

### npm shrinkwrap
```
npm notice package-lock.json has been renamed to npm-shrinkwrap.json
```

---

**Note**: This is a Next.js project named "nextn" version 0.1.0 with a comprehensive set of dependencies including:
- React 18.3.x with TypeScript 5.7.3
- Next.js (version not explicitly shown in package.json but inferred from build artifacts)
- Radix UI components for the UI
- Prisma for database operations
- Firebase for backend services
- Genkit AI integrations
- Various utility libraries for forms, charts, and PDF generation

The project has been successfully built with build ID: BKLUtdX9tqN6pI2v-4GRJ