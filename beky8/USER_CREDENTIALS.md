# HR Management System - User Credentials

## Login Information
**All users use the same password:** `password123`

## Key Administrative Users

### System Administrator
- **Username:** `akassim`
- **Name:** Amina Kassim
- **Role:** Admin
- **Institution:** TUME YA UTUMISHI SERIKALINI
- **Access:** Full system administration, User Management, Institution Management

### Senior Management
- **Username:** `skhamis`
- **Name:** Safia Khamis
- **Role:** HHRMD (Head of HR Management Department)
- **Institution:** TUME YA UTUMISHI SERIKALINI
- **Access:** Full HR management functions

- **Username:** `zhaji`
- **Name:** Zaituni Haji
- **Role:** CSCS (Civil Service Commission Secretary)
- **Institution:** TUME YA UTUMISHI SERIKALINI
- **Access:** Commission oversight, reports, audit trail

### HR Officers
- **Username:** `hro_commission`
- **Name:** HRO (Tume)
- **Role:** HRO (Human Resource Officer)
- **Institution:** TUME YA UTUMISHI SERIKALINI
- **Access:** Full HR processes, urgent actions

- **Username:** `kmnyonge`
- **Name:** Khamis Mnyonge
- **Role:** HRO
- **Institution:** OFISI YA RAIS, FEDHA NA MIPANGO
- **Access:** Full HR processes for President's Office

- **Username:** `ahmedm`
- **Name:** Ahmed Mohammed
- **Role:** HRO
- **Institution:** WIZARA YA ELIMU NA MAFUNZO YA AMALI
- **Access:** Full HR processes for Education Ministry

- **Username:** `mariamj`
- **Name:** Mariam Juma
- **Role:** HRO
- **Institution:** WIZARA YA AFYA
- **Access:** Full HR processes for Health Ministry

### Other Management Roles
- **Username:** `fiddi`
- **Name:** Fauzia Iddi
- **Role:** HRMO (Human Resource Management Officer)
- **Institution:** TUME YA UTUMISHI SERIKALINI
- **Access:** HR operational tasks

- **Username:** `mussi`
- **Name:** Maimuna Ussi
- **Role:** DO (Director Officer)
- **Institution:** TUME YA UTUMISHI SERIKALINI
- **Access:** Complaint handling, termination processes

- **Username:** `mishak`
- **Name:** Mwanakombo Is-hak
- **Role:** PO (Payroll Officer)
- **Institution:** TUME YA UTUMISHI SERIKALINI
- **Access:** Employee profiles, payroll functions

- **Username:** `khamadi`
- **Name:** Khamis Hamadi
- **Role:** HRRP (HR Representative)
- **Institution:** TUME YA UTUMISHI SERIKALINI
- **Access:** Urgent actions, request tracking

## Employee Users (Sample)
**Total: 148 employees across various institutions**

Some notable employees for testing:
- **Username:** `alijuma` - Ali Juma Ali (OFISI YA RAIS, FEDHA NA MIPANGO)
- **Username:** `khadijanassor` - Khadija Nassor (WIZARA YA ELIMU NA MAFUNZO YA AMALI)
- **Username:** `yussufmakame` - Yussuf Makame (WIZARA YA ELIMU NA MAFUNZO YA AMALI)

## Role Summary
- **Admin:** 1 user (Full system access)
- **CSCS:** 1 user (Commission Secretary)
- **DO:** 1 user (Director Officer)
- **HHRMD:** 1 user (Head of HR Management)
- **HRMO:** 1 user (HR Management Officer)
- **HRO:** 4 users (Human Resource Officers)
- **HRRP:** 1 user (HR Representative)
- **PO:** 1 user (Payroll Officer)
- **EMPLOYEE:** 148 users (Regular employees)

## Role Permissions

### Admin (akassim)
- Dashboard with system statistics
- User Management (create, edit, delete users)
- Institution Management (manage institutions)
- All HR functions
- Audit trail access
- Reports and analytics

### HHRMD (skhamis)
- Dashboard with HR statistics
- All HR request types (confirmation, promotion, LWOP, etc.)
- Employee management
- Complaint handling
- Reports and analytics
- Track status

### HRO (hro_commission, kmnyonge, ahmedm, mariamj)
- Dashboard with HR statistics
- All HR request types
- Urgent actions
- Employee management
- Complaint handling
- Reports and analytics
- Track status

### CSCS (zhaji)
- Dashboard
- Employee profiles
- Track status
- Reports and analytics
- Audit trail access

### DO (mussi)
- Dashboard
- Employee profiles
- Complaint handling
- Termination processes
- Track status
- Reports and analytics

### HRMO (fiddi)
- Dashboard
- All HR request types
- Employee management
- Track status
- Reports and analytics

### HRRP (khamadi)
- Dashboard
- Urgent actions
- Employee profiles
- Track status
- Reports and analytics

### PO (mishak)
- Dashboard (redirects to profile)
- Employee profiles
- Track status
- Reports and analytics

### EMPLOYEE (all others)
- Dashboard (redirects to profile)
- Employee profiles (own profile)
- Complaint submission
- Track status (own requests)

## Testing Recommendations

1. **Admin Testing:** Use `akassim` to test user and institution management
2. **HR Workflow Testing:** Use `skhamis` or `hro_commission` for HR processes
3. **Employee Testing:** Use any employee account to test employee workflows
4. **Cross-Institution Testing:** Use HROs from different institutions to test access controls

## Security Notes
- All passwords are currently set to `password123` for development
- In production, implement individual secure passwords
- Consider implementing password reset functionality
- Enable account lockout after failed attempts
- Implement session timeouts for security