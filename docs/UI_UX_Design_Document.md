# UI/UX Design Document
## Civil Service Management System (CSMS)

---

## Document Control

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2024-12-25 | System Architect | Initial UI/UX Design Document |

**Document Status:** Final
**Classification:** Internal

---

## Executive Summary

This UI/UX Design Document provides comprehensive guidelines for the Civil Service Management System's user interface and user experience. The document covers design principles, style guide specifications, component library, user flows, wireframes, and accessibility standards.

The CSMS employs a modern, professional design system built on industry-standard frameworks (React 19, Tailwind CSS, Radix UI) to ensure consistency, accessibility, and excellent user experience across all user roles and devices.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Style Guide](#2-style-guide)
3. [Component Library](#3-component-library)
4. [User Flows](#4-user-flows)
5. [Wireframes and Mockups](#5-wireframes-and-mockups)
6. [Accessibility Guidelines](#6-accessibility-guidelines)
7. [Responsive Design](#7-responsive-design)
8. [Appendices](#8-appendices)

---

## 1. Design Principles

### 1.1 Core Principles

#### 1.1.1 Clarity and Simplicity
- **Clear Visual Hierarchy**: Important information is prominently displayed
- **Minimal Cognitive Load**: Complex processes broken into simple, sequential steps
- **Clean Interface**: Ample white space, uncluttered layouts
- **Consistent Patterns**: Repeatable UI patterns across all modules

#### 1.1.2 Efficiency and Productivity
- **Quick Access**: Common actions accessible with minimal clicks
- **Keyboard Shortcuts**: Support for keyboard navigation (Cmd/Ctrl+B for sidebar toggle)
- **Bulk Operations**: Support for handling multiple items simultaneously
- **Smart Defaults**: Pre-filled forms based on context

#### 1.1.3 Professional and Trustworthy
- **Government Standards**: Adheres to official government UI patterns
- **Professional Color Palette**: Conservative, professional blue/gray scheme
- **Formal Typography**: Clear, readable sans-serif fonts
- **Polished Components**: High-quality, well-tested UI components

#### 1.1.4 Accessibility First
- **WCAG 2.1 AA Compliance**: Meets international accessibility standards
- **Screen Reader Support**: Full ARIA support for assistive technologies
- **Keyboard Navigation**: Complete keyboard accessibility
- **Color Contrast**: Sufficient contrast ratios for readability

#### 1.1.5 Mobile Responsive
- **Progressive Enhancement**: Works on all device sizes
- **Touch-Friendly**: Appropriate touch targets on mobile
- **Adaptive Layouts**: Optimized layouts for different screen sizes
- **Mobile-First Forms**: Simplified mobile form experiences

#### 1.1.6 Performance Optimized
- **Fast Loading**: Optimized assets and lazy loading
- **Smooth Animations**: 200ms transition durations
- **Progressive Loading**: Skeleton screens during data fetch
- **Optimistic UI**: Immediate feedback on user actions

---

## 2. Style Guide

### 2.1 Color System

#### 2.1.1 Primary Color Palette

**Light Mode:**
```css
--primary: hsl(217, 71%, 53%)           /* Strong professional blue #3B82F6 */
--primary-foreground: hsl(0, 0%, 100%)  /* White text on primary */
--background: hsl(220, 60%, 97%)        /* Very light cool blue/gray */
--foreground: hsl(215, 25%, 20%)        /* Dark desaturated blue/gray */
```

**Dark Mode:**
```css
--primary: hsl(217, 71%, 60%)           /* Slightly brighter blue */
--primary-foreground: hsl(0, 0%, 100%)  /* White on primary */
--background: hsl(210, 13%, 10%)        /* Darker background */
--foreground: hsl(210, 25%, 96%)        /* Light gray foreground */
```

#### 2.1.2 Semantic Colors

| Color | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|--------|
| Card | `hsl(0, 0%, 100%)` | `hsl(210, 13%, 12%)` | Card backgrounds |
| Popover | `hsl(0, 0%, 100%)` | `hsl(210, 13%, 12%)` | Dropdown backgrounds |
| Secondary | `hsl(220, 15%, 90%)` | `hsl(210, 13%, 18%)` | Secondary elements |
| Muted | `hsl(220, 15%, 85%)` | `hsl(210, 13%, 22%)` | Muted backgrounds |
| Accent | `hsl(217, 90%, 95%)` | `hsl(217, 50%, 30%)` | Hover states |
| Destructive | `hsl(0, 84.2%, 60.2%)` | `hsl(0, 70%, 50%)` | Error/delete actions |
| Border | `hsl(220, 20%, 88%)` | `hsl(210, 13%, 20%)` | Borders |
| Input | `hsl(220, 20%, 88%)` | `hsl(210, 13%, 20%)` | Input borders |
| Ring | `hsl(217, 71%, 60%)` | `hsl(217, 71%, 65%)` | Focus rings |

#### 2.1.3 Chart Colors

```css
--chart-1: hsl(217, 71%, 53%)  /* Primary blue */
--chart-2: hsl(190, 60%, 50%)  /* Cyan */
--chart-3: hsl(28, 80%, 60%)   /* Orange */
--chart-4: hsl(160, 50%, 55%)  /* Green */
--chart-5: hsl(310, 60%, 65%)  /* Purple */
```

#### 2.1.4 Sidebar Colors

```css
/* Light Mode */
--sidebar-background: hsl(220, 30%, 94%)      /* Rich light cool gray/blue */
--sidebar-foreground: hsl(215, 25%, 25%)      /* Darker text */
--sidebar-accent: hsl(217, 70%, 88%)          /* Light blue hover */
--sidebar-accent-foreground: hsl(217, 71%, 50%) /* Primary blue text */
--sidebar-border: hsl(220, 20%, 85%)          /* Darker border */

/* Dark Mode */
--sidebar-background: hsl(210, 13%, 15%)      /* Darker sidebar */
--sidebar-foreground: hsl(210, 25%, 90%)      /* Lighter text */
--sidebar-accent: hsl(217, 60%, 35%)          /* Saturated blue hover */
--sidebar-accent-foreground: hsl(210, 25%, 95%) /* Very light text */
--sidebar-border: hsl(210, 13%, 22%)          /* Dark border */
```

### 2.2 Typography

#### 2.2.1 Font Families

```css
font-family-body: 'Inter', sans-serif
font-family-headline: 'Inter', sans-serif
font-family-code: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
                  "Liberation Mono", "Courier New", monospace
```

**Inter Font Features:**
- Professional sans-serif optimized for screens
- Excellent readability at all sizes
- Comprehensive character set support
- Variable font weights (100-900)

#### 2.2.2 Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| H1 | 2.25rem (36px) | 700 | 1.2 | Page titles |
| H2 | 1.875rem (30px) | 600 | 1.3 | Section headers |
| H3 | 1.5rem (24px) | 600 | 1.4 | Subsection headers |
| H4 | 1.25rem (20px) | 600 | 1.5 | Card titles |
| Body Large | 1rem (16px) | 400 | 1.5 | Main content |
| Body | 0.875rem (14px) | 400 | 1.5 | Default text |
| Body Small | 0.75rem (12px) | 400 | 1.4 | Supporting text |
| Caption | 0.625rem (10px) | 400 | 1.3 | Labels, metadata |
| Button | 0.875rem (14px) | 500 | 1 | Button text |

#### 2.2.3 Font Weights

- **Regular (400)**: Body text, descriptions
- **Medium (500)**: Buttons, emphasized text
- **Semibold (600)**: Headings, section titles
- **Bold (700)**: Page titles, important headings

### 2.3 Spacing System

**8-Point Grid System:**

```css
spacing-0: 0px
spacing-1: 0.25rem (4px)
spacing-2: 0.5rem (8px)
spacing-3: 0.75rem (12px)
spacing-4: 1rem (16px)
spacing-5: 1.25rem (20px)
spacing-6: 1.5rem (24px)
spacing-8: 2rem (32px)
spacing-10: 2.5rem (40px)
spacing-12: 3rem (48px)
spacing-16: 4rem (64px)
spacing-20: 5rem (80px)
spacing-24: 6rem (96px)
```

**Usage Guidelines:**
- Card padding: `p-6` (24px)
- Section gaps: `gap-4` (16px) or `gap-8` (32px)
- Form field spacing: `space-y-2` (8px vertical)
- Button padding: `px-4 py-2` (16px horizontal, 8px vertical)

### 2.4 Border Radius

```css
--radius: 0.5rem (8px)           /* Base radius */
--radius-lg: var(--radius)       /* 8px */
--radius-md: calc(var(--radius) - 2px)  /* 6px */
--radius-sm: calc(var(--radius) - 4px)  /* 4px */
```

**Usage:**
- Cards: `rounded-lg` (8px)
- Buttons: `rounded-md` (6px)
- Inputs: `rounded-md` (6px)
- Badges: `rounded-md` (6px)
- Small elements: `rounded-sm` (4px)

### 2.5 Shadows

```css
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
```

**Usage:**
- Cards: `shadow-sm`
- Modals: `shadow-lg`
- Dropdowns: `shadow-md`
- Hover states: Increase shadow depth

### 2.6 Animation and Transitions

#### 2.6.1 Transition Durations

```css
transition-fast: 100ms
transition-normal: 200ms
transition-slow: 300ms
```

#### 2.6.2 Easing Functions

```css
ease-out: cubic-bezier(0, 0, 0.2, 1)     /* Default */
ease-linear: linear                       /* Progress bars */
```

#### 2.6.3 Standard Animations

**Accordion:**
```css
@keyframes accordion-down {
  from { height: 0 }
  to { height: var(--radix-accordion-content-height) }
}
animation: accordion-down 0.2s ease-out
```

**Accordion Up:**
```css
@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height) }
  to { height: 0 }
}
animation: accordion-up 0.2s ease-out
```

---

## 3. Component Library

### 3.1 Component Inventory

The CSMS uses **shadcn/ui**, a collection of 35+ re-usable components built on Radix UI primitives:

#### 3.1.1 Layout Components

| Component | Purpose | Props | Usage |
|-----------|---------|-------|-------|
| **Card** | Container for grouped content | `className` | Dashboard widgets, content sections |
| **CardHeader** | Card header section | `className` | Card titles and descriptions |
| **CardTitle** | Card title text | `className` | Main card heading |
| **CardDescription** | Card subtitle | `className` | Supporting description |
| **CardContent** | Card body content | `className` | Main card content |
| **CardFooter** | Card footer section | `className` | Actions, metadata |
| **Separator** | Visual divider | `orientation` | Section dividers |
| **ScrollArea** | Scrollable container | `className` | Long content areas |
| **Sheet** | Slide-out panel | `open`, `onOpenChange` | Mobile menus, side panels |

#### 3.1.2 Navigation Components

| Component | Purpose | Props | Usage |
|-----------|---------|-------|-------|
| **Sidebar** | Main navigation sidebar | `side`, `variant`, `collapsible` | App navigation |
| **SidebarProvider** | Sidebar context provider | `defaultOpen`, `open` | Wraps sidebar layout |
| **SidebarHeader** | Sidebar header area | `className` | Logo, branding |
| **SidebarContent** | Sidebar main content | `className` | Navigation items |
| **SidebarFooter** | Sidebar footer | `className` | User menu, logout |
| **SidebarMenu** | Menu container | `className` | Navigation menu |
| **SidebarMenuItem** | Single menu item | `className` | Navigation link |
| **SidebarMenuButton** | Menu button | `isActive`, `tooltip`, `variant`, `size` | Clickable nav item |
| **SidebarMenuSub** | Submenu container | `className` | Nested navigation |
| **SidebarMenuSubButton** | Submenu button | `isActive`, `size` | Nested nav item |
| **Tabs** | Tabbed interface | `value`, `onValueChange` | Content organization |
| **TabsList** | Tab list container | `className` | Tab buttons container |
| **TabsTrigger** | Tab button | `value` | Individual tab button |
| **TabsContent** | Tab panel | `value` | Tab content panel |

#### 3.1.3 Form Components

| Component | Purpose | Props | Usage |
|-----------|---------|-------|-------|
| **Form** | Form wrapper (react-hook-form) | `...methods` | Form container |
| **FormField** | Controlled form field | `control`, `name`, `render` | Individual field |
| **FormItem** | Form field container | `className` | Field wrapper |
| **FormLabel** | Field label | `className` | Input labels |
| **FormControl** | Input wrapper | `className` | Input container |
| **FormDescription** | Helper text | `className` | Field descriptions |
| **FormMessage** | Error message | `className` | Validation errors |
| **Input** | Text input | `type`, `placeholder`, `disabled` | Text entry |
| **Textarea** | Multi-line text | `placeholder`, `rows` | Long text entry |
| **Select** | Dropdown select | `value`, `onValueChange` | Single selection |
| **Checkbox** | Checkbox input | `checked`, `onCheckedChange` | Boolean input |
| **RadioGroup** | Radio button group | `value`, `onValueChange` | Single choice |
| **Switch** | Toggle switch | `checked`, `onCheckedChange` | Boolean toggle |
| **Calendar** | Date picker | `selected`, `onSelect` | Date selection |
| **Slider** | Range slider | `value`, `onValueChange`, `min`, `max` | Numeric range |

#### 3.1.4 Feedback Components

| Component | Purpose | Props | Usage |
|-----------|---------|-------|-------|
| **Alert** | Status message | `variant` | Important messages |
| **AlertDialog** | Confirmation dialog | `open`, `onOpenChange` | Destructive actions |
| **Toast** | Temporary notification | `title`, `description`, `variant` | Action feedback |
| **Toaster** | Toast container | N/A | Toast renderer |
| **Progress** | Progress indicator | `value` | Loading progress |
| **Skeleton** | Loading placeholder | `className` | Content loading |
| **Badge** | Status indicator | `variant` | Labels, status tags |

#### 3.1.5 Overlay Components

| Component | Purpose | Props | Usage |
|-----------|---------|-------|-------|
| **Dialog** | Modal dialog | `open`, `onOpenChange` | Forms, confirmations |
| **Popover** | Floating content | `open`, `onOpenChange` | Contextual info |
| **Tooltip** | Hover information | `content`, `side` | Helper text |
| **DropdownMenu** | Contextual menu | `open`, `onOpenChange` | Actions menu |
| **Menubar** | Menu bar | N/A | Top-level menus |

#### 3.1.6 Data Display Components

| Component | Purpose | Props | Usage |
|-----------|---------|-------|-------|
| **Table** | Data table | `className` | Tabular data |
| **TableHeader** | Table header | `className` | Column headers |
| **TableBody** | Table body | `className` | Data rows |
| **TableRow** | Table row | `className` | Single row |
| **TableHead** | Header cell | `className` | Column header cell |
| **TableCell** | Data cell | `className` | Data cell |
| **Avatar** | User avatar | `src`, `alt`, `fallback` | User images |
| **Chart** | Data visualization | `config`, `data` | Charts and graphs |
| **Accordion** | Collapsible content | `type`, `value` | Expandable sections |

#### 3.1.7 Custom Components

| Component | Purpose | Props | Usage |
|-----------|---------|-------|-------|
| **FileUpload** | File upload widget | `accept`, `maxSize`, `multiple`, `folder` | Document uploads |
| **FilePreviewModal** | File preview | `fileUrl`, `fileName`, `onClose` | PDF/image preview |

### 3.2 Button Variants

#### 3.2.1 Button Styles

```tsx
<Button variant="default">Primary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary</Button>
<Button variant="secondary">Tertiary</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="link">Link Style</Button>
```

#### 3.2.2 Button Sizes

```tsx
<Button size="default">Default</Button>  {/* h-10 px-4 */}
<Button size="sm">Small</Button>         {/* h-9 px-3 */}
<Button size="lg">Large</Button>         {/* h-11 px-8 */}
<Button size="icon">Icon</Button>        {/* h-10 w-10 */}
```

#### 3.2.3 Button States

- **Default**: Normal state
- **Hover**: `hover:bg-primary/90` (10% darker)
- **Active**: `active:bg-primary/90`
- **Focus**: `focus-visible:ring-2 focus-visible:ring-ring`
- **Disabled**: `disabled:opacity-50 disabled:pointer-events-none`

### 3.3 Badge Variants

```tsx
<Badge variant="default">Status</Badge>      {/* Primary blue */}
<Badge variant="secondary">Info</Badge>      {/* Gray */}
<Badge variant="destructive">Error</Badge>   {/* Red */}
<Badge variant="outline">Outlined</Badge>    {/* Bordered */}
```

### 3.4 Component Usage Guidelines

#### 3.4.1 Cards
- Use for grouping related content
- Always include CardHeader with CardTitle
- Maintain consistent padding (p-6)
- Add hover effects for clickable cards

#### 3.4.2 Forms
- Use react-hook-form with Zod validation
- Always provide FormLabel and FormDescription
- Display FormMessage for validation errors
- Group related fields with visual spacing

#### 3.4.3 Tables
- Use TableHeader for column headers
- Implement sorting and filtering for large datasets
- Include loading skeletons during data fetch
- Add "No data" states

#### 3.4.4 File Upload
- Restrict to PDF files only (accept=".pdf")
- 2MB max file size default
- Show upload progress with Progress component
- Display preview and download actions

---

## 4. User Flows

### 4.1 Authentication Flow

```
┌─────────────────┐
│   Login Page    │
│                 │
│ - Username      │
│ - Password      │
│ - Login Button  │
└────────┬────────┘
         │
         ├──[Success]──► Dashboard
         │
         └──[Failure]──► Error Message
```

**Steps:**
1. User enters username and password
2. Form validation (Zod schema)
3. API call to `/api/auth/login`
4. On success: Store JWT token, redirect to dashboard
5. On failure: Display error toast

### 4.2 Dashboard Flow

```
┌─────────────────────────────────────────────────────┐
│                    Dashboard                        │
├─────────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │ Stat │  │ Stat │  │ Stat │  │ Stat │  │ Stat │ │
│  │ Card │  │ Card │  │ Card │  │ Card │  │ Card │ │
│  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──────┘ │
│     │         │         │         │                 │
│     └─────────┴─────────┴─────────┘                 │
│                   │                                  │
│                   ▼                                  │
│         Detail Page (e.g., Promotions)              │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │          Recent Activities Table            │   │
│  │  - Request ID  - Type  - Employee  - Status │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Navigation Paths:**
- Click stat card → Navigate to filtered view
- Click activity row → Navigate to request detail
- Use sidebar navigation → Direct page access

### 4.3 Request Submission Flow

```
User Journey: Submitting a Promotion Request

1. Navigate to Promotions
   ↓
2. Click "New Request" button
   ↓
3. Form Dialog Opens
   ├── Select Employee (Dropdown)
   ├── Enter Proposed Cadre
   ├── Select Promotion Type
   ├── Upload Documents (FileUpload)
   └── Submit Button
   ↓
4. Form Validation
   ├── [Valid] → API Call
   │             ↓
   │          Success Toast → Redirect to List
   │
   └── [Invalid] → Display Error Messages
```

**Detailed Steps:**

**Step 1: List View**
- Table showing all promotion requests
- Filters: Status, Review Stage, Date Range
- Search by employee name or ID
- "New Request" button (HRO only)

**Step 2: Form Dialog**
- Modal dialog with form
- All fields clearly labeled
- Required fields marked with asterisk (*)
- Real-time validation feedback

**Step 3: File Upload**
- Drag-and-drop area
- Click to browse files
- PDF only, max 2MB
- Progress bar during upload
- Preview uploaded files
- Remove file option

**Step 4: Submission**
- Loading state on button
- Optimistic UI update
- Success toast notification
- Auto-redirect to list view

**Step 5: Review Process**
- Request appears in reviewer's queue
- Email notification sent
- Status badge updated
- Audit trail recorded

### 4.4 Request Review Flow

```
Reviewer Journey: Processing a Request

1. Dashboard Shows Pending Count
   ↓
2. Click Pending Stat Card
   ↓
3. Filter: Review Stage = "Pending at [Role]"
   ↓
4. Click Request Row
   ↓
5. Detail View Opens
   ├── Employee Information (Read-only)
   ├── Request Details (Read-only)
   ├── Uploaded Documents (Preview/Download)
   ├── Review Actions:
   │   ├── Approve Button (Green)
   │   ├── Reject Button (Red)
   │   └── Comments Textarea
   └── Workflow Timeline
   ↓
6. Reviewer Actions:
   ├── [Approve] → Confirmation Dialog
   │               ↓
   │            API Call → Update Status → Next Stage
   │
   └── [Reject] → Rejection Dialog
                   ↓
                Enter Reason → API Call → Update Status → Notify Submitter
```

### 4.5 Employee Profile Flow

```
View Employee Profile

1. Search/Navigate to Employee
   ├── Search by Name/ID
   ├── Browse from List
   └── Click from Dashboard
   ↓
2. Employee Profile Page
   ├─────────────────────────────────────┐
   │  Profile Header                     │
   │  ┌─────────┐                        │
   │  │  Photo  │  Name, ID, Ministry    │
   │  └─────────┘  Contact Info          │
   ├─────────────────────────────────────┤
   │  Tabs:                              │
   │  ┌───────────────────────────────┐  │
   │  │ Overview │ Requests │ Documents│ │
   │  └───────────────────────────────┘  │
   │                                     │
   │  Tab Content:                       │
   │  - Personal Information             │
   │  - Employment Details               │
   │  - Request History                  │
   │  - Uploaded Documents               │
   └─────────────────────────────────────┘
```

### 4.6 Document Management Flow

```
Upload and Manage Documents

1. File Upload Component
   ├── Drag & Drop Zone
   │   ├── Visual Feedback on Drag
   │   └── Drop File to Upload
   │
   ├── Click to Browse
   │   └── System File Picker
   │
   └── Validation
       ├── File Type Check (.pdf only)
       ├── File Size Check (≤ 2MB)
       └── Show Error Toast if Invalid
   ↓
2. Upload Process
   ├── Show Progress Bar (0-100%)
   ├── Upload to MinIO via API
   └── Store Object Key in Database
   ↓
3. File List Display
   ├── File Name
   ├── File Size
   ├── Upload Date
   └── Actions:
       ├── Preview (Opens in new tab)
       ├── Download (Direct download)
       └── Delete (Confirmation required)
```

### 4.7 Notification Flow

```
Notification System

Trigger Event → Create Notification → Display to User

Events:
├── Request Submitted → Notify Reviewer
├── Request Approved → Notify Submitter & Employee
├── Request Rejected → Notify Submitter
├── Request Forwarded → Notify Next Reviewer
└── Deadline Approaching → Notify Responsible Party

Display:
├── Bell Icon (Header)
│   └── Badge with Unread Count
├── Click Bell → Notification Dropdown
│   ├── List of Notifications (Latest 10)
│   ├── Mark as Read on Click
│   └── "View All" Link
└── Notification Item Click → Navigate to Related Page
```

### 4.8 Report Generation Flow

```
Generate Report

1. Navigate to Reports Page
   ↓
2. Select Report Type
   ├── Employee Report
   ├── Request Summary
   ├── Institutional Report
   └── Custom Report
   ↓
3. Set Filters
   ├── Date Range
   ├── Department
   ├── Status
   └── Other Criteria
   ↓
4. Generate Report
   ├── Show Loading Indicator
   ├── Fetch Data from API
   └── Render Report
   ↓
5. Report Display
   ├── Summary Statistics
   ├── Data Table
   ├── Charts/Graphs
   └── Export Options:
       ├── PDF
       ├── Excel
       └── CSV
```

---

## 5. Wireframes and Mockups

### 5.1 Login Page

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                       ┌───────────┐                          │
│                       │   Logo    │                          │
│                       └───────────┘                          │
│                                                              │
│                   Civil Service Management                   │
│                          System                              │
│                                                              │
│              ┌─────────────────────────────────┐             │
│              │                                 │             │
│              │  Username                       │             │
│              │  ┌───────────────────────────┐  │             │
│              │  │                           │  │             │
│              │  └───────────────────────────┘  │             │
│              │                                 │             │
│              │  Password                       │             │
│              │  ┌───────────────────────────┐  │             │
│              │  │           ••••••          │  │             │
│              │  └───────────────────────────┘  │             │
│              │                                 │             │
│              │    ┌───────────────────────┐   │             │
│              │    │      Login            │   │             │
│              │    └───────────────────────┘   │             │
│              │                                 │             │
│              └─────────────────────────────────┘             │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Elements:**
- Centered layout with max-width card
- Logo and system name at top
- Two input fields (username, password)
- Primary action button (Login)
- Clean, minimal design

### 5.2 Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐  Civil Service Management System         [🔔] [User ▼]        │
│ │   Logo   │                                                                 │
│ └──────────┘                                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ │          │                                                                 │
│ │ [☰]      │  Dashboard - [Institution Name]                                │
│ │          │  Manage all your HR processes in one place.                    │
│ │ Nav      │                                                                 │
│ │ Items:   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │          │  │  Total  │ │ Pending │ │ Pending │ │Employees│ │ Pending │ │
│ │ • Dash   │  │Employees│ │ Confirm │ │Promotns │ │ on LWOP │ │Terminatn│ │
│ │ • Profile│  │         │ │         │ │         │ │         │ │         │ │
│ │ • Promtn │  │  1,234  │ │   45    │ │   23    │ │   12    │ │    8    │ │
│ │ • Confirm│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│ │ • LWOP   │                                                                 │
│ │ • Retire │  ┌─────────────────────────────────────────────────────────┐   │
│ │ • Resign │  │  Recent Activities                                      │   │
│ │ • Admin  │  │  An overview of the latest requests and their statuses. │   │
│ │          │  ├───────────┬──────────────┬───────────┬──────────────┤   │
│ │ [Logout] │  │Request ID │ Type         │ Employee  │ Status       │   │
│ │          │  ├───────────┼──────────────┼───────────┼──────────────┤   │
│ └──────────┘  │ PR-2024-1 │ Promotion    │ John Doe  │ Pending HHRMD│   │
│               │ CF-2024-2 │ Confirmation │ Jane Smith│ Approved     │   │
│               │ LW-2024-3 │ LWOP         │ Bob Jones │ Rejected     │   │
│               └───────────┴──────────────┴───────────┴──────────────┘   │
│                                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout Structure:**
- **Header (Fixed)**: Logo, notifications, user menu
- **Sidebar (Collapsible)**: Navigation menu (16rem width, 3rem collapsed)
- **Main Content**: Page header + content area
- **Responsive**: Sidebar becomes sheet/drawer on mobile

### 5.3 Request List View

```
┌──────────────────────────────────────────────────────────────────────┐
│ Promotion Requests                                                   │
│ Manage promotion requests and their review workflows.                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ┌────────────────────────────┐  ┌────────────┐  [+ New Request]     │
│ │ 🔍 Search by employee...   │  │ Filter ▼   │                       │
│ └────────────────────────────┘  └────────────┘                       │
│                                                                       │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ Request ID   │ Employee      │ Proposed  │ Status    │ Action │   │
│ ├──────────────┼───────────────┼───────────┼───────────┼────────┤   │
│ │ PR-2024-001  │ John Doe      │ Manager   │ Pending   │  View  │   │
│ │              │ ZNZ123456     │           │ HRO       │        │   │
│ │──────────────┼───────────────┼───────────┼───────────┼────────┤   │
│ │ PR-2024-002  │ Jane Smith    │ Director  │ Approved  │  View  │   │
│ │              │ ZNZ789012     │           │ CSCS      │        │   │
│ │──────────────┼───────────────┼───────────┼───────────┼────────┤   │
│ │ PR-2024-003  │ Bob Wilson    │ Officer   │ Rejected  │  View  │   │
│ │              │ ZNZ345678     │           │ HRO       │        │   │
│ └──────────────┴───────────────┴───────────┴───────────┴────────┘   │
│                                                                       │
│                    [<]  1  2  3  4  5  [>]                            │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Search bar for filtering
- Filter dropdown (status, stage, date)
- Data table with key columns
- Status badges with color coding
- Action buttons (View, Edit, Delete)
- Pagination controls

### 5.4 Request Detail View

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back to List                                    [Approve] [Reject]  │
├──────────────────────────────────────────────────────────────────────┤
│ Promotion Request - PR-2024-001                                       │
│ Status: Pending at HRO     Created: 2024-12-15                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ┌─ Employee Information ──────────────────────────────────────────┐  │
│ │                                                                  │  │
│ │  Name: John Doe                  ZAN ID: ZNZ123456              │  │
│ │  Current Cadre: Officer          Ministry: Health               │  │
│ │  Institution: Ministry of Health                                │  │
│ │                                                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌─ Request Details ───────────────────────────────────────────────┐  │
│ │                                                                  │  │
│ │  Proposed Cadre: Manager                                        │  │
│ │  Promotion Type: Regular                                        │  │
│ │  Studied Outside Country: No                                    │  │
│ │  Submitted By: Jane Smith (HRO)                                 │  │
│ │  Submitted Date: 2024-12-15                                     │  │
│ │                                                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌─ Supporting Documents ──────────────────────────────────────────┐  │
│ │                                                                  │  │
│ │  📄 Performance_Review_2024.pdf         [👁️ View] [⬇ Download]  │  │
│ │  📄 Training_Certificate.pdf            [👁️ View] [⬇ Download]  │  │
│ │  📄 Recommendation_Letter.pdf           [👁️ View] [⬇ Download]  │  │
│ │                                                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌─ Review Timeline ───────────────────────────────────────────────┐  │
│ │                                                                  │  │
│ │  ✓ Submitted by HRO                     2024-12-15 10:30 AM     │  │
│ │  ○ Pending at HRO Review                Awaiting Action         │  │
│ │  ○ Pending at HHRMD                     Not Started             │  │
│ │  ○ Pending at CSCS                      Not Started             │  │
│ │                                                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Sections:**
1. **Action Bar**: Back button, primary actions
2. **Request Header**: ID, status, dates
3. **Employee Information**: Read-only employee data
4. **Request Details**: Specific request fields
5. **Documents**: List with preview/download
6. **Timeline**: Visual workflow progress

### 5.5 Form Dialog (New Request)

```
┌───────────────────────────────────────────────────────────┐
│ Create Promotion Request                              [×] │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Employee *                                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Select employee...                               ▼ │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Proposed Cadre *                                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Promotion Type *                                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Select type...                                   ▼ │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Supporting Documents *                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                   📤                                │  │
│  │      Click or drag files here to upload            │  │
│  │      Max size: 2MB | Allowed types: PDF only       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ☐ Studied Outside Country                               │
│                                                           │
│                                                           │
│                          [Cancel]  [Submit Request]       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Form Elements:**
- Required fields marked with (*)
- Select dropdowns for enums
- File upload with drag-drop
- Checkbox for boolean fields
- Cancel and Submit buttons

### 5.6 Employee Profile View

```
┌──────────────────────────────────────────────────────────────────────┐
│ Employee Profile                                      [Edit Profile]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────┐                                                          │
│  │        │  John Doe                                                │
│  │ Photo  │  ZAN ID: ZNZ123456                                       │
│  │        │  Email: john.doe@gov.zz                                  │
│  └────────┘  Phone: +255 777 123 456                                 │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Overview  │  Employment  │  Requests  │  Documents  │  History │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Personal Information                                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Date of Birth:      1990-05-15                               │   │
│  │ Gender:             Male                                     │   │
│  │ Place of Birth:     Zanzibar                                 │   │
│  │ Contact Address:    123 Main St, Stone Town                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Employment Details                                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Ministry:           Health                                   │   │
│  │ Department:         Public Health                            │   │
│  │ Cadre:              Officer                                  │   │
│  │ Salary Scale:       GS-7                                     │   │
│  │ Employment Date:    2015-06-01                               │   │
│  │ Confirmation Date:  2018-06-01                               │   │
│  │ Retirement Date:    2050-05-15                               │   │
│  │ Status:             Active                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Tab Structure:**
- **Overview**: Personal and employment summary
- **Employment**: Detailed employment history
- **Requests**: All requests for this employee
- **Documents**: Uploaded certificates and files
- **History**: Audit trail of changes

### 5.7 Mobile View (Responsive)

```
┌─────────────────────┐
│ ☰  CSMS      🔔 [👤]│
├─────────────────────┤
│                     │
│ Dashboard           │
│                     │
│ ┌─────────────────┐ │
│ │ Total Employees │ │
│ │                 │ │
│ │      1,234      │ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │Pending Confirms │ │
│ │                 │ │
│ │       45        │ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │Pending Promotns │ │
│ │                 │ │
│ │       23        │ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
└─────────────────────┘
```

**Mobile Adaptations:**
- Hamburger menu (☰) for navigation
- Single column layout
- Stacked stat cards
- Bottom sheet for actions
- Touch-friendly targets (min 44×44px)

---

## 6. Accessibility Guidelines

### 6.1 WCAG 2.1 AA Compliance

#### 6.1.1 Perceivable

**1.1 Text Alternatives**
- All images have `alt` attributes
- Icons are accompanied by text labels or `aria-label`
- Decorative icons use `aria-hidden="true"`

**1.3 Adaptable**
- Semantic HTML (headings, lists, tables)
- Proper heading hierarchy (H1 → H2 → H3)
- Form labels associated with inputs
- ARIA landmarks (navigation, main, complementary)

**1.4 Distinguishable**
- Color contrast ratio ≥ 4.5:1 for normal text
- Color contrast ratio ≥ 3:1 for large text (18pt+)
- Information not conveyed by color alone
- Focus indicators visible (2px ring)

#### 6.1.2 Operable

**2.1 Keyboard Accessible**
- All interactive elements keyboard accessible
- Logical tab order
- No keyboard traps
- Skip to main content link
- Keyboard shortcuts:
  - `Cmd/Ctrl + B`: Toggle sidebar
  - `Esc`: Close dialogs/modals
  - `Tab`: Move forward
  - `Shift + Tab`: Move backward
  - `Enter/Space`: Activate buttons

**2.2 Enough Time**
- Session timeout with warning
- Auto-refresh can be paused
- Form autosave to prevent data loss

**2.3 Seizures and Physical Reactions**
- No flashing content
- No content flashing more than 3 times per second

**2.4 Navigable**
- Page titles describe topic/purpose
- Focus order follows visual order
- Link text describes destination
- Multiple ways to find pages (nav, search)
- Clear headings and labels

#### 6.1.3 Understandable

**3.1 Readable**
- Language specified: `<html lang="en">`
- Clear, concise text
- Avoid jargon, explain technical terms

**3.2 Predictable**
- Consistent navigation across pages
- Consistent component behavior
- Context changes announced
- No unexpected context changes on focus

**3.3 Input Assistance**
- Clear error messages
- Form validation with helpful messages
- Error prevention for critical actions
- Confirmation dialogs for destructive actions
- Required fields marked with (*)

#### 6.1.4 Robust

**4.1 Compatible**
- Valid HTML5
- Proper ARIA usage
- Screen reader tested (NVDA, JAWS, VoiceOver)
- Browser compatibility (Chrome, Firefox, Safari, Edge)

### 6.2 ARIA Implementation

#### 6.2.1 ARIA Roles

```tsx
// Navigation
<nav aria-label="Main navigation">

// Main content
<main id="main-content">

// Search
<search role="search">

// Alert messages
<div role="alert" aria-live="assertive">

// Status messages
<div role="status" aria-live="polite">
```

#### 6.2.2 ARIA States and Properties

```tsx
// Expanded/Collapsed
<button aria-expanded="true">Menu</button>

// Current page
<a aria-current="page">Dashboard</a>

// Disabled
<button aria-disabled="true">Submit</button>

// Required fields
<input aria-required="true" />

// Error messages
<input aria-invalid="true" aria-describedby="error-message" />
<span id="error-message">Email is required</span>

// Form fields
<input aria-labelledby="label-id" aria-describedby="description-id" />
```

#### 6.2.3 Live Regions

```tsx
// Toast notifications
<div role="status" aria-live="polite" aria-atomic="true">
  File uploaded successfully
</div>

// Error alerts
<div role="alert" aria-live="assertive" aria-atomic="true">
  Form submission failed
</div>
```

### 6.3 Screen Reader Support

#### 6.3.1 Screen Reader Only Text

```tsx
<span className="sr-only">Close dialog</span>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

#### 6.3.2 Skip Links

```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: white;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### 6.4 Focus Management

#### 6.4.1 Focus Visible

All interactive elements have visible focus indicators:

```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

#### 6.4.2 Focus Trapping

Dialogs and modals trap focus:

```tsx
// When dialog opens
- Save currently focused element
- Move focus to dialog
- Trap focus within dialog (Tab cycles through dialog elements)
- Restore focus to saved element when dialog closes
```

### 6.5 Form Accessibility

#### 6.5.1 Label Association

```tsx
<FormLabel htmlFor="email">Email Address</FormLabel>
<Input id="email" type="email" />
```

#### 6.5.2 Error Handling

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input
          {...field}
          aria-invalid={!!form.formState.errors.email}
          aria-describedby="email-error"
        />
      </FormControl>
      <FormMessage id="email-error" />
    </FormItem>
  )}
/>
```

### 6.6 Color and Contrast

#### 6.6.1 Contrast Ratios

All color combinations meet WCAG AA standards:

| Combination | Ratio | Pass |
|-------------|-------|------|
| Primary text on white | 12.6:1 | ✓ AA (>4.5:1) |
| Muted text on white | 4.8:1 | ✓ AA (>4.5:1) |
| Primary button | 4.5:1 | ✓ AA (>3:1) |
| Border on white | 3.2:1 | ✓ AA (>3:1) |

#### 6.6.2 Non-Color Indicators

Information never relies on color alone:

- Status indicated by badge text + color
- Required fields marked with (*) + label
- Errors shown with icon + text + color
- Links underlined + different color

### 6.7 Testing Checklist

- [ ] All images have alt text
- [ ] All form fields have labels
- [ ] Color contrast meets AA standards
- [ ] Keyboard navigation works completely
- [ ] Focus indicators are visible
- [ ] Screen reader announces all content
- [ ] ARIA attributes are correct
- [ ] Headings are in logical order
- [ ] No keyboard traps exist
- [ ] Skip links work properly
- [ ] Error messages are clear
- [ ] Live regions announce updates
- [ ] Dialogs trap and restore focus
- [ ] Tables have proper headers
- [ ] Links have descriptive text

---

## 7. Responsive Design

### 7.1 Breakpoint System

```css
/* Tailwind CSS Breakpoints */
sm: 640px    /* Small tablets */
md: 768px    /* Tablets */
lg: 1024px   /* Small laptops */
xl: 1280px   /* Desktops */
2xl: 1536px  /* Large desktops */
```

### 7.2 Responsive Patterns

#### 7.2.1 Sidebar Navigation

```
Desktop (≥768px):
- Sidebar always visible (16rem width)
- Collapsible to icon-only (3rem width)
- Main content shifts with sidebar

Mobile (<768px):
- Sidebar hidden by default
- Hamburger menu button in header
- Sidebar opens as sheet overlay
- Backdrop closes sidebar on click
```

#### 7.2.2 Grid Layouts

```tsx
// Stat cards
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
  {/* Cards */}
</div>

Mobile: 1 column
Tablet: 2 columns
Desktop: 3-5 columns
```

#### 7.2.3 Tables

```
Desktop:
- Full table with all columns
- Horizontal scroll if needed

Tablet:
- Reduce column count
- Hide less important columns
- Show on expand/detail view

Mobile:
- Card-based view instead of table
- Stack information vertically
- Tap to expand for full details
```

#### 7.2.4 Forms

```
Desktop:
- Two-column layouts
- Side-by-side fields

Tablet/Mobile:
- Single column layout
- Full-width fields
- Larger touch targets
- Native input types for mobile keyboards
```

### 7.3 Touch Optimization

#### 7.3.1 Touch Targets

Minimum touch target size: **44×44px** (Apple HIG, Google Material)

```tsx
// Buttons
<Button size="default">  {/* h-10 (40px) + padding */}
<Button size="lg">       {/* h-11 (44px) + padding */}

// Icon buttons
<Button size="icon">     {/* h-10 w-10 (40px×40px) */}
```

#### 7.3.2 Touch Gestures

- **Swipe**: Dismiss notifications, navigate carousel
- **Tap**: Activate buttons, select items
- **Long Press**: Show context menu (mobile)
- **Pull to Refresh**: Reload data (mobile)

### 7.4 Responsive Images

```tsx
// Profile images
<Avatar>
  <AvatarImage
    src={profileImageUrl}
    alt={employeeName}
    loading="lazy"
  />
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>

// Document previews
<img
  src={thumbnailUrl}
  alt={documentName}
  className="object-cover w-full h-48"
  loading="lazy"
/>
```

### 7.5 Mobile-Specific Components

#### 7.5.1 Sheet (Mobile Sidebar)

```tsx
// Mobile navigation
<Sheet open={openMobile} onOpenChange={setOpenMobile}>
  <SheetContent side="left" className="w-[18rem]">
    {/* Navigation content */}
  </SheetContent>
</Sheet>
```

#### 7.5.2 Bottom Sheet

```tsx
// Mobile action sheets
<Sheet>
  <SheetContent side="bottom">
    <SheetHeader>
      <SheetTitle>Actions</SheetTitle>
    </SheetHeader>
    {/* Action buttons */}
  </SheetContent>
</Sheet>
```

### 7.6 Performance Optimization

#### 7.6.1 Lazy Loading

```tsx
// Code splitting
const PromotionForm = lazy(() => import('@/components/forms/promotion-form'))

// Image lazy loading
<img loading="lazy" src={imageUrl} alt="..." />
```

#### 7.6.2 Responsive Images

```tsx
// Serve appropriate image sizes
<img
  srcSet="
    image-320w.jpg 320w,
    image-640w.jpg 640w,
    image-1280w.jpg 1280w
  "
  sizes="(max-width: 640px) 320px, (max-width: 1280px) 640px, 1280px"
  src="image-640w.jpg"
  alt="..."
/>
```

---

## 8. Appendices

### 8.1 Icon Library

**Lucide React Icons** - 1000+ icons

Commonly used icons:

| Icon | Component | Usage |
|------|-----------|-------|
| Users | `<Users />` | Employee management |
| UserCheck | `<UserCheck />` | Confirmations |
| TrendingUp | `<TrendingUp />` | Promotions |
| CalendarOff | `<CalendarOff />` | LWOP |
| FileText | `<FileText />` | Documents |
| Bell | `<Bell />` | Notifications |
| Settings | `<Settings />` | Settings |
| LogOut | `<LogOut />` | Logout |
| Upload | `<Upload />` | File upload |
| Download | `<Download />` | Download |
| Eye | `<Eye />` | Preview |
| Trash2 | `<Trash2 />` | Delete |
| Edit | `<Edit />` | Edit |
| X | `<X />` | Close |

### 8.2 Design Tokens Reference

```typescript
// Colors
const colors = {
  primary: 'hsl(217, 71%, 53%)',
  background: 'hsl(220, 60%, 97%)',
  foreground: 'hsl(215, 25%, 20%)',
  // ... (see Section 2.1)
}

// Spacing (rem)
const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  // ... (see Section 2.3)
}

// Border Radius
const borderRadius = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
}

// Typography
const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
}
```

### 8.3 CSS Utilities Reference

**Commonly Used Tailwind Classes:**

```css
/* Layout */
.flex, .grid, .block, .inline-block, .hidden
.container, .mx-auto

/* Spacing */
.p-4, .px-6, .py-2, .m-4, .gap-4, .space-y-2

/* Typography */
.text-sm, .text-lg, .font-medium, .font-bold
.text-foreground, .text-muted-foreground

/* Colors */
.bg-background, .bg-primary, .text-primary
.border-border, .ring-ring

/* Sizing */
.w-full, .h-10, .min-h-screen, .max-w-2xl

/* Positioning */
.relative, .absolute, .fixed, .sticky
.top-0, .left-0, .right-0, .bottom-0, .z-10

/* Borders */
.border, .border-2, .border-t, .rounded-lg

/* Effects */
.shadow-sm, .opacity-50, .hover:bg-accent
.transition-colors, .duration-200

/* Responsive */
.md:grid-cols-2, .lg:text-xl, .sm:hidden
```

### 8.4 Form Validation Patterns

**Zod Schemas:**

```typescript
// Email validation
email: z.string().email('Invalid email address')

// Required text
name: z.string().min(1, 'Name is required')

// Optional text
notes: z.string().optional()

// Date in future
effectiveDate: z.date().min(new Date(), 'Date must be in future')

// File array
documents: z.array(z.string()).min(1, 'At least one document required')

// Boolean
studiedOutside: z.boolean().optional()

// Enum
promotionType: z.enum(['REGULAR', 'ACCELERATED', 'SPECIAL'])
```

### 8.5 Animation Examples

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fadeIn {
  animation: fadeIn 200ms ease-out;
}

/* Slide in from right */
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.animate-slideInRight {
  animation: slideInRight 300ms ease-out;
}

/* Scale in */
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-scaleIn {
  animation: scaleIn 200ms ease-out;
}
```

### 8.6 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | Latest 2 versions | ✓ Full |
| Firefox | Latest 2 versions | ✓ Full |
| Safari | Latest 2 versions | ✓ Full |
| Edge | Latest 2 versions | ✓ Full |
| Mobile Safari | iOS 13+ | ✓ Full |
| Chrome Mobile | Android 8+ | ✓ Full |

### 8.7 Design Resources

**Figma Files:** (To be created)
**Style Guide:** This document
**Component Library:** Storybook (To be implemented)
**Icon Library:** https://lucide.dev/icons/
**Color Palette:** See Section 2.1
**Typography:** Inter font family

### 8.8 Best Practices Summary

1. **Always use design tokens** - Never hardcode colors or spacing
2. **Mobile-first approach** - Design for mobile, enhance for desktop
3. **Accessibility first** - Test with keyboard and screen reader
4. **Consistent spacing** - Use 8-point grid system
5. **Clear hierarchy** - Use proper heading levels
6. **Loading states** - Always show skeleton/spinner during loading
7. **Error handling** - Clear, helpful error messages
8. **Responsive images** - Use appropriate sizes for different screens
9. **Touch targets** - Minimum 44×44px for mobile
10. **Performance** - Lazy load images and code split components

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| UI/UX Designer | | | |
| Frontend Lead | | | |
| Product Manager | | | |
| Accessibility Specialist | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-25 | System Architect | Initial document creation |

---

**End of Document**
