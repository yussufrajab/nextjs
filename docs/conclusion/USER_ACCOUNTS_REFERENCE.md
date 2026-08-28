# CSMS User Accounts — Complete Reference

**System:** Civil Service Management System (CSMS) — Zanzibar
**Date:** 16 August 2026
**Source:** Live database (localhost:5432/nody)
**MFA Policy:** Mandatory for ALL users (enforced 2026-08-16)

---

## 1. Summary by Role

| Role | Total Users | With Email (MFA ready) | Without Email (blocked) | MFA Required |
|---|---|---|---|---|
| Admin | 3 | 3 | 0 | Yes (mandatory) |
| CSCS | 1 | 1 | 0 | Yes (mandatory) |
| HHRMD | 3 | 3 | 0 | Yes (mandatory) |
| HRMO | 2 | 1 | 1 | Yes (mandatory) |
| DO | 2 | 2 | 0 | Yes (mandatory) |
| PO | 1 | 1 | 0 | Yes (mandatory) |
| HRO | 22 | 22 | 0 | Yes (mandatory) |
| HRO_PEMBA | 2 | 2 | 0 | Yes (mandatory) |
| HRRP | 107 | 105 | 2 | Yes (mandatory) |
| HRRP_PEMBA | 2 | 2 | 0 | Yes (mandatory) |
| EMPLOYEE | 61 | 19 | 42 | Yes (mandatory, via employee-login route) |
| **Total** | **206** | **161** | **45** | **All** |

> **Note:** 45 users (42 employees + 3 staff) still have no email and will be blocked from login until an administrator adds an email to their account. Employee accounts are auto-provisioned via JIT and prompted for a government email on first login.

---

## 2. Role Descriptions

| Role | Full Name | Access Level | MFA | Description |
|---|---|---|---|---|
| Admin | Administrator | System-wide | Yes | System management — create users, institutions, reset passwords, HRIMS config |
| CSCS | Civil Service Commission Secretary | All institutions | Yes | Executive oversight — view all actions, download reports |
| HHRMD | Head of HR Management Development | All institutions | Yes | Senior CSC approver — approves HR & disciplinary requests |
| HRMO | HR Management Officer | All institutions | Yes | CSC approver — approves HR requests (not complaints/terminations) |
| DO | Disciplinary Officer | All institutions | Yes | Handles complaints, terminations, dismissals |
| PO | Planning Officer | All institutions (read-only) | Yes | Views reports only — cannot submit or approve |
| HRO | HR Officer | Own institution only | Yes | Submits HR requests — institution-scoped |
| HRO_PEMBA | Pemba-scoped HR Officer | Own institution + Pemba island only | Yes | Submits HR requests — restricted to Pemba employees |
| HRRP | HR Responsible Personnel | Own institution only | Yes | Institutional supervisor — reviews and forwards requests |
| HRRP_PEMBA | Pemba-scoped HRRP | Own institution + Pemba island only | Yes | Reviews and forwards — restricted to Pemba employees |
| EMPLOYEE | Employee | Own data only | Yes | Submits complaints, views own profile (via employee-login) |

---

## 3. UAT Test Accounts

These are the primary accounts used for User Acceptance Testing. All passwords are set to `Csms@2026abc` (Admin: `Csms@2026abc1`). All have MFA enabled.

| # | Username | Role | Name | Email | Phone | Institution | Password |
|---|---|---|---|---|---|---|---|
| 1 | ymrajab | Admin | Yussuf Mzee Rajab | yussuf.rajab@zanajira.go.tz | 0751842129 | Tume ya Utumishi Serikalini | Csms@2026abc1 |
| 2 | akassim | Admin | Amina Kassim | amina.ali@zanajira.go.tz | 0757020490 | Tume ya Utumishi Serikalini | Csms@2026abc |
| 3 | zhaji | CSCS | Zaituni Haji | zaituni.haji@zanajira.go.tz | 0759495325 | Tume ya Utumishi Serikalini | Csms@2026abc |
| 4 | skhamis | HHRMD | Safia Khamis | safia.khamis@zanajira.go.tz | 0744076214 | Tume ya Utumishi Serikalini | Csms@2026abc |
| 5 | fiddi | HRMO | Fauzia Iddi | fauzia.iddi@zanajira.go.tz | 0779701108 | Tume ya Utumishi Serikalini | Csms@2026abc |
| 6 | mussi | DO | Maimuna Ussi | maimuna.ussi@zanajira.go.tz | 0759380480 | Tume ya Utumishi Serikalini | Csms@2026abc |
| 7 | mishak | PO | Mwanakombo Is-hak | mishak@mock.local | — | Tume ya Utumishi Serikalini | Csms@2026abc |
| 8 | mabdi | HRO | Masoud Salum Abdi | aminanne@zanajira.go.tz | 0909876543 | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo | Csms@2026abc |
| 9 | bimkubwa | HRO_PEMBA | Bimkubwa Tume | maombismz@zanajira.go.tz | 0777412490 | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo | Csms@2026abc |
| 10 | noah | HRRP | Noah | aminatano@zanajira.go.tz | — | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo | Csms@2026abc |
| 11 | asultan | HRRP_PEMBA | Abasi Sultan | helpdesk@zanajira.go.tz | 0776084050 | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo | Csms@2026abc |

> **Employee Login:** Requires ZanID + Payroll Number + ZSSF Number. JIT provisioning creates an EMPLOYEE-role account if none exists. A government email is required for MFA.

---

## 4. All Active Staff Users (Non-Employee)

### 4.1 Admin (3 users)

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| akassim | Amina Kassim | amina.ali@zanajira.go.tz | 0757020490 | Tume ya Utumishi Serikalini |
| amos | Amos Maziku | amos.maziku@egaz.go.tz | 0657859131 | Tume ya Utumishi Serikalini |
| ymrajab | Yussuf Mzee Rajab | yussuf.rajab@zanajira.go.tz | 0751842129 | Tume ya Utumishi Serikalini |

### 4.2 CSCS — Civil Service Commission Secretary (1 user)

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| zhaji | Zaituni Haji | zaituni.haji@zanajira.go.tz | 0759495325 | Tume ya Utumishi Serikalini |

### 4.3 HHRMD — Head of HR Management Development (3 users)

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| harith | Harith Abdalla Ali | aminasita@zanajira.go.tz | 0779648603 | Tume ya Utumishi Serikalini |
| skhamis | Safia Khamis | safia.khamis@zanajira.go.tz | 0744076214 | Tume ya Utumishi Serikalini |
| vuai | vuai makame | vuai.juma@gmail.com | 0657859130 | Tume ya Utumishi Serikalini |

### 4.4 HRMO — HR Management Officer (2 users)

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| fautest | Fauzia Majaribo | *(no email — blocked)* | — | Tume ya Utumishi Serikalini |
| fiddi | Fauzia Iddi | fauzia.iddi@zanajira.go.tz | 0779701108 | Tume ya Utumishi Serikalini |

### 4.5 DO — Disciplinary Officer (2 users)

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| maitest | Maimuna Majaribio | maitest@mock.local | — | Tume ya Utumishi Serikalini |
| mussi | Maimuna Ussi | maimuna.ussi@zanajira.go.tz | 0759380480 | Tume ya Utumishi Serikalini |

### 4.6 PO — Planning Officer (1 user)

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| mishak | Mwanakombo Is-hak | mishak@mock.local | — | Tume ya Utumishi Serikalini |

### 4.7 HRO — HR Officer (22 users)

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| asahmed | Ahmed Suleiman Ahmed | ahmed.ahmed@egaz.go.tz | 0773402344 | Mamlaka ya Serikali Mtandao (eGAZ) |
| famohamed | Fatma Ali Mohamed | fatma.mohamed@vijana.go.tz | 0777486359 | Wizara ya Habari, Vijana, Utamaduni na Michezo |
| haabdulkadir | Hanifa Abdullah Abdulkadir | hanifa.abdulkadir@utaliismz.go.tz | 0776914850 | Wizara ya Utalii na Mambo ya Kale |
| haali | Harith Abdalla Ali | hatith.ali@utaliiznz.go.tz | 0776245047 | Kamisheni ya Utalii Zanzibar |
| habdalla | Harith Abdalla | habadalla@ardhi.go.tz | 0776346383 | Kamisheni ya Ardhi Zanzibar |
| hafidh | Hafidh Ali | mohd@zanajira.go.tz | 0772121212 | Wizara ya Majaribio |
| khihussein | Khadija Idrissa Hussein | khadija.hussein@uwekezaji.go.tz | 0773046364 | Afisi ya Raisi Kazi, Uchumi na Uwekezaji |
| kmakame | Khadija Makame | kmakame@zanajira.go.tz | 0776346383 | Baraza la Manispaa Magharibi A |
| kmhaji | Kombo M Haji | kombo.haji@omkr.go.tz | 0774164015 | Ofisi ya Makamo wa Kwanza wa Raisi |
| kmnyonge | Khamis Mnyonge | kmnyonge@mock.local | 0703028469 | Tume ya Utumishi Serikalini |
| knsaid | Khelewa Nasir Said | khelewa.said@tamisemi.go.tz | 0620381944 | Ofisi ya Rais, Tawala za Mikoa, Serikali za Mitaa na Idara Maalumu za SMZ |
| lela | Lela Kassim Ali | lkali@kilimo.go.tz | 0776346383 | Baraza la Mitihani |
| mabdi | Masoud Salum Abdi | aminanne@zanajira.go.tz | 0909876543 | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo |
| mwanaidi | Mwanaidi Ame Makame | mwanaidi.makame@kaskazinibdcsmz.go.tz | 0676323638 | Ofisi ya Mkuu wa Wilaya ya Kaskazini B |
| nmjuma | Naima Mussa Juma | nmjuma@zanajira.go.tz | 0777243453 | Halmashauri ya Wilaya ya Kusini Unguja |
| nmussa | Naima Mussa | nmussa@zanajira.go.tz | 0777243453 | Baraza la Manispaa Magharibi B |
| ramdungi | Rayhan Abubakar Mdungi | rayhan.mdungi@ikulu.go.tz | 0774225255 | Ofisi ya Rais - IKULU |
| sajuma | Shara A Juma | shara.juma@ompr.go.tz | 0772491846 | Ofisi ya Makamo wa Pili wa Raisi |
| skawesu | Shuwekha Awesu | skawesu@zanajira.go.tz | — | Tume ya Utumishi Serikalini |
| smabrouk | Salma Mabrouk | salma.mabrouk@vijana.go.tz | 0777486359 | Wizara ya Habari, Vijana, Utamaduni na Michezo |
| yhzubeir | Yussuf H Zubeir | yhzubeir@zanajira.go.tz | — | Tume ya Utumishi Serikalini |
| zsaid | Zaid Said | zaid.said@kaya.go.tz | 0657859130 | Wizara ya Afya |

### 4.8 HRO_PEMBA — Pemba-scoped HR Officer (2 users)

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| bimkubwa | Bimkubwa Tume | maombismz@zanajira.go.tz | 0777412490 | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo |
| halima | Halima Hamad | ipa.maombi@zanajira.go.tz | 0777101011 | Wizara ya Afya |

### 4.9 HRRP — HR Responsible Personnel (107 users)

> Full list available in the database. Below are the UAT-relevant accounts. The remaining 105 HRRP users are institution-based supervisors across all 76 government institutions.

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| noah | Noah | aminatano@zanajira.go.tz | — | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo |
| mahfoudhhassan | Mahfoudh Mohammed Hassan | *(no email — blocked)* | — | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo |
| fhali | Farida Haji Ali | *(no email — blocked)* | 0774537075 | Ofisi ya Msajili wa Hazina |
| Hassan | Hassan Hussein Hassan | hassan.hassan@zanajira.go.tz | 0777105226 | Tume ya Utumishi Serikalini |
| shuwekhaawesu | Shuwekha Awesu Suleiman | shuwekha.suleiman@zanajira.go.tz | — | Tume ya Utumishi Serikalini |

> **2 HRRP users without email (blocked from login):** `fhali` and `mahfoudhhassan` — an administrator must add email addresses to these accounts.

### 4.10 HRRP_PEMBA — Pemba-scoped HRRP (2 users)

| Username | Name | Email | Phone | Institution |
|---|---|---|---|---|
| asultan | Abasi Sultan | helpdesk@zanajira.go.tz | 0776084050 | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo |
| kbsilima | Khadija Bakar Silima | ali@zanajira.go.tz | 0766101011 | Wizara ya Afya |

---

## 5. Employee Users (61 users)

Employee accounts are auto-provisioned (JIT) when an employee logs in via the employee portal using ZanID + Payroll Number + ZSSF Number. A government email is required for MFA — if no email is on file, the system prompts for one before proceeding.

### 5.1 Employees WITH Email (19 users — MFA ready)

| Username | Name | Email | Institution |
|---|---|---|---|
| abdillahomarnajim | Abdillah Omar Najim | aminanne@zanajira.go.tz | Wakala wa Majengo Zanzibar |
| amosjamesmaziku | Amos James Maziku | 1@123.go.tz | Mamlaka ya Serikali Mtandao (eGAZ) |
| asiamohdabeid | Asia Moh'd Abeid | aminasita@zanajira.go.tz | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo |
| azizafadhilkhamis | Aziza Fadhil Khamis | aminamosi@zanajira.go.tz | Mamlaka ya Kuzuia Rushwa na Uhujumu wa Uchumi Zanzibar |
| balkishusseinothman | Balkis Hussein Othman | naima@zanajira.go.tz | Wizara ya Maendeleo ya Jamii, Jinsia, Wazee na Watoto |
| differentuser | Test User | duplicate@example.com | Tume ya Utumishi Serikalini |
| duplicatetest | Test Duplicate User | duplicate@example.com | Tume ya Utumishi Serikalini |
| fauziamakameame | Fauzia Makame Ame | aminamoja@zanajira.go.tz | Tume ya Utumishi Serikalini |
| hajihamadbaraka | Haji Hamad Baraka | harith.ali@zanajira.go.tz | Wizara ya Afya |
| mmanga | Ali Mmanga | ali.mmanga@egaz.go.tz | Mamlaka ya Serikali Mtandao (eGAZ) |
| nassirkhamiskombo | Nassir Khamis Kombo | nassir.kombo@moez.go.tz | Wizara ya Elimu na Mafunzo ya Amali |
| sadaamehaji | Sada Ame Haji | yussuf.rajab@zanajira.go.tz | Tume ya Utumishi Serikalini |
| salehmohdjuma | Saleh Moh'd Juma | saleh.juma@moez.go.tz | Wizara ya Elimu na Mafunzo ya Amali |
| salehesaidsalehe | Salehe Said Salehe | aminanne@zanajira.go.tz | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo |
| ummukulthumhamissalum | Ummukulthum Hamis Salum | aminatatu@zanajira.go.tz | Wizara ya Afya |
| zanisaidshaha | Zani Said Shaha | aminatisa@zanajira.go.tz | Wizara ya Afya |
| zulisalimkundi | Zuli Salim Kundi | safia.khamis@zanajira.go.tz | Tume ya Utumishi Serikalini |
| uatduplicatetest1768319076 | UAT Duplicate Test | uatduplicatetest1768319076@example.com | Tume ya Utumishi Serikalini |
| null | Test | different@example.com | Tume ya Utumishi Serikalini |

### 5.2 Employees WITHOUT Email (42 users — blocked from login)

These employees cannot log in until a government email is added to their account. They will be prompted for an email on first login attempt via the employee portal.

| Username | Name | Institution |
|---|---|---|
| abdullaameiramour | Abdulla Ameir Amour | Wizara ya Habari, Vijana, Utamaduni na Michezo |
| alihassansuleiman | Ali Hassan Suleiman | Wizara ya Afya |
| aliibrahimomar | Ali Ibrahim Omar | Tume ya Ushindani Halali wa Biashara |
| arafaabbassissa | Arafa Abbass Issa | Wizara ya Afya |
| asiagharibhaji | Asia Gharib Haji | Wizara ya Afya |
| asyaibrahimalawi | Asya Ibrahim Alawi | Taasisi ya Nyaraka na Kumbukumbu |
| ghazalabdullathani | Ghazal Abdulla Thani | Afisi ya Raisi Kazi, Uchumi na Uwekezaji |
| hakimshehahaji | Hakim Sheha Haji | Wizara ya Habari, Vijana, Utamaduni na Michezo |
| harithabdallaali | Harith Abdalla Ali | Tume ya Utumishi Serikalini |
| hassanaliabdulla | Hassan Ali Abdulla | Ofisi ya Rais, Tawala za Mikoa, Serikali za Mitaa na Idara Maalumu za SMZ |
| hassanhusseinhassan | Hassan Hussein Hassan | Tume ya Utumishi Serikalini |
| jinasuleimanjecha | Jina Suleiman Jecha | Baraza la Mji Kaskazini A Unguja |
| jokhasalimjuma | Jokha Salim Juma | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo |
| jumahajimbwembwe | Juma Haji Mbwembwe | Tume ya Utumishi Serikalini |
| khelewanassirsaid | Khelewa Nassir Said | Ofisi ya Rais, Tawala za Mikoa, Serikali za Mitaa na Idara Maalumu za SMZ |
| kombolelamakungukobis | Kombolela Makungu Kobis | Wizara ya Maji Nishati na Madini |
| lelakassimali | Lela Kassim Ali | Tume ya Utumishi Serikalini |
| maimunaabeidhussein | Maimuna Abeid Hussein | Taasisi ya Nyaraka na Kumbukumbu |
| maimunabakarussi | Maimuna Bakar Ussi | Tume ya Utumishi Serikalini |
| maryamabdullamussa | Maryam Abdulla Mussa | Ofisi ya Mkuu wa Mkoa wa Mjini Magharibi Unguja |
| mbarakakhamisali | Mbaraka Khamis Ali | Wizara ya Afya |
| mgeniabdallasalum | Mgeni Abdalla Salum | Taasisi ya Nyaraka na Kumbukumbu |
| mwarabumuhdinkuona | Mwarabu Muhdin Kuona | Wizara ya Elimu na Mafunzo ya Amali |
| naifatalisuleiman | Naifat Ali Suleiman | Wizara ya Utalii na Mambo ya Kale |
| nassirmmangaomar | Nassir Mmanga Omar | Taasisi ya Nyaraka na Kumbukumbu |
| ngwalijumangwali | Ngwali Juma Ngwali | Taasisi ya Nyaraka na Kumbukumbu |
| omarikarumejuma | Omari Karume Juma | Taasisi ya Nyaraka na Kumbukumbu |
| ramadhanabdallaali | Ramadhan Abdalla Ali | Wizara ya Afya |
| rehemakeiskhamis | Rehema Keis Khamis | Ofisi ya Mkuu wa Mkoa wa Kusini Unguja |
| saidaabdijuma | Saida Abdi Juma | Wizara ya Elimu na Mafunzo ya Amali |
| salimjumasalim | Salim Juma Salim | Tume ya Utumishi Serikalini |
| saudahajijuma | Sauda Haji Juma | Wizara ya Elimu na Mafunzo ya Amali |
| shuwekhanassormussa | Shuwekha Nassor Mussa | Tume ya Utumishi Serikalini |
| swalehziadiswaleh | Swaleh Ziadi Swaleh | Tume ya Utumishi Serikalini |
| 4hhrmd | Test User Updated | Tume ya Utumishi Serikalini |
| safiatest | Sophy Majaribio | Tume ya Utumishi Serikalini |
| zumesaidhassan | Zume Said Hassan | Tume ya Utumishi Serikalini |
| zulfaabasshaji | Zulfa Abas Shaji | Tume ya Utumishi Serikalini |
| zuwenaissaamour | Zuwena Issa Amour | Tume ya Utumishi Serikalini |
| maitest | Maimuna Majaribio | Tume ya Utumishi Serikalini |
| zariya | Zariya | Tume ya Utumishi Serikalini |

---

## 6. Users Without Email — Action Required

These users are **blocked from login** under the new mandatory MFA policy. An administrator must add a government email address to each account.

### Staff Users (3 — need immediate attention)

| Username | Role | Name | Institution | Status |
|---|---|---|---|---|
| fautest | HRMO | Fauzia Majaribo | Tume ya Utumishi Serikalini | Blocked — no email |
| fhali | HRRP | Farida Haji Ali | Ofisi ya Msajili wa Hazina | Blocked — no email |
| mahfoudhhassan | HRRP | Mahfoudh Mohammed Hassan | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo | Blocked — no email |

### Employee Users (42 — will be prompted for email on first login)

Employees without email will see an `EMAIL_REQUIRED` prompt when they try to log in via the employee portal. They must provide a valid government email address before MFA can be sent.

---

## 7. Inactive Users

| Username | Role | Name | Reason |
|---|---|---|---|
| admin | Admin | System Administrator | Inactive (system account) |
| khamadi | HRRP | Khamadi | Inactive |
| yhzubeir | HRO | Yussuf H Zubeir | Active (listed above) |

---

## 8. MFA Configuration

| Setting | Value |
|---|---|
| Policy | Mandatory for ALL users (2026-08-16) |
| MFA method | Email OTP (one-time password) + Magic link |
| Token expiry | 10 minutes (`MFA_TOKEN_EXPIRY_MINUTES`) |
| OTP rate limit | 3 requests per 60 seconds per user |
| Max verify attempts | 5 per token |
| MFA token table | `MfaToken` (stores type, email, attempts, expiry, usedAt) |
| Masking | Email masked in API response (e.g. `a***@gov.go.tz`) |

### Login Flow (all users)

```
User submits username + password
    → Password verified (Argon2id)
    → Account not locked, not expired, not inactive
    → MFA required (always true)
        → User has email?
            YES → Generate OTP + magic link → Send via email → Return MFA_REQUIRED
            NO  → Return 403 MFA_REQUIRED_NO_EMAIL (login blocked)
    → User submits OTP or clicks magic link
    → MFA verified → Session created → Login complete
```

---

## 9. Password Policy

| Setting | Value |
|---|---|
| Hashing | Argon2id (19 MiB memory, 2 iterations, 1 lane) |
| Minimum length | 12 characters |
| Complexity | 4 character classes (uppercase, lowercase, number, special) |
| History | 5 (cannot reuse last 5 passwords) |
| Expiry | 90 days (standard), 60 days (Admin) |
| Grace period | 7 days after expiry |
| Temporary password expiry | 7 days |
| Max change attempts | 5 (then 30-minute lockout) |
| Breach check | HIBP (Have I Been Pwned) k-anonymity model |
| Common password rejection | zxcvbn dictionary |

---

## 10. Security Features by Role

| Feature | Admin | CSCS | HHRMD | HRMO | DO | PO | HRO | HRO_PEMBA | HRRP | HRRP_PEMBA | EMPLOYEE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MFA | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Session timeout | 10 min | 10 min | 10 min | 10 min | 10 min | 10 min | 10 min | 10 min | 10 min | 10 min | 10 min |
| Password expiry | 60 days | 90 days | 90 days | 90 days | 90 days | 90 days | 90 days | 90 days | 90 days | 90 days | 90 days |
| Step-up reauth | Yes | Yes | Yes | Yes | Yes | No | No | No | No | No | No |
| Institution scope | All | All | All | All | All | All (read) | Own | Own + Pemba | Own | Own + Pemba | Self only |
| Submit HR requests | No | No | No | No | No | No | Yes | Yes | Yes | Yes | No |
| HRRP review | No | No | No | No | No | No | No | No | Yes | Yes | No |
| Commission approve HR | No | No | Yes | Yes | No | No | No | No | No | No | No |
| Commission approve termination | No | No | Yes | No | Yes | No | No | No | No | No | No |
| Submit complaints | No | No | No | No | No | No | No | No | No | No | Yes |
| Handle complaints | No | No | Yes | No | Yes | No | No | No | No | No | No |
| View all institutions | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No | No | No |
| Create users | Yes | No | No | No | No | No | No | No | No | No | No |
| View audit trail | Yes | No | No | No | No | No | No | No | No | No | No |
| View reports | Yes | Yes | Yes | Yes | Yes | Yes (read) | Yes | Yes | Yes | Yes | No |
| Complaint reports | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No | No | No |

---

*Generated 16 August 2026 from the CSMS production database. All passwords are Argon2id hashed and cannot be reversed. The passwords listed in the UAT section are the known test passwords set by administrators for testing purposes only.*