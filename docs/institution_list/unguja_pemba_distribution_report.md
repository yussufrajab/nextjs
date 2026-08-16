# REPORT: EMPLOYEE DISTRIBUTION BY ISLAND (UNGUJA vs PEMBA) PER INSTITUTION

**Tume ya Utumishi Serikalini — Civil Service Management System (CSMS)**

**Report Date:** August 2026

---

## 1. Executive Summary

This report shows the distribution of employees between **Unguja** and **Pemba** islands
across all 69 institutions in the CSMS database. Island assignment is based on **work location**
fields only — not birthplace — to correctly reflect where each employee is physically posted.

### Classification Method

Island is determined from work-location fields in priority order:

1. **`department`** — e.g. "Ofisi Kuu Pemba", "OFISI YA URATIBU PEMBA" (strongest indicator)
2. **`currentWorkplace`** — e.g. "Wilaya ya Wete", "Baraza la Manispaa Mjini" (district-level)
3. **`currentReportingOffice`** — e.g. "Ofisi Kuu Pemba", "Vituo vya Utafiti Pemba"
4. **`Institution name`** — e.g. "Ofisi ya Mkuu wa Mkoa wa Kaskazini Pemba" (institution is island-specific)

> **NOT used:** `region` / `placeOfBirth` — these represent the employee's birthplace,
> not their current work location. An employee born in Pemba but working at Ministry HQ
> in Unguja is counted as **Unguja**. An employee born in Unguja but posted to Pemba is counted as **Pemba**.

### Pemba Indicators

Any of these keywords in department, currentWorkplace, currentReportingOffice, or institution name:

- `pemba`, `chake`, `wete`, `mkoani`, `micheweni`

### Unguja Indicators

Any of these keywords in currentWorkplace, currentReportingOffice, or institution name:

- `unguja`, `mjini`, `magharibi`, `kaskazini a`, `kaskazini b`, `kusini`, `tumbatu`, `wilaya ya kati`

### Classification Priority

When an employee matches **both** Pemba and Unguja indicators, **Pemba takes priority**.
This is because Pemba indicators are more specific (department names like "Ofisi Kuu Pemba")
while Unguja indicators are often generic district names that also appear in Pemba-context records.

### Unclassified

Employees whose work-location fields contain **no island keyword**. These are predominantly
staff at central ministry headquarters and national agencies (e.g. "Wizara ya Afya" as
currentWorkplace, "Idara ya Tiba" as department). The HQ of all ministries and most national
institutions is in **Unguja**. However, some unclassified employees may actually be posted
to Pemba field offices without the island name appearing in their HRIMS data.

| Metric | Value |
|---|---|
| Total employees | **43,510** |
| Pemba (detected) | 4,191 (9.6%) |
| Unguja (detected) | 2,170 (5.0%) |
| Unclassified (no island keyword) | 37,149 (85.4%) |

---

## 2. Summary by Institution Category

| Category | Total | Pemba | Unguja | Unclassified | Pemba % | Unguja % |
|---|---|---|---|---|---|---|
| **WIZARA (Ministry)** | **28,815** | 2,325 | 7 | 26,483 | 8.1% | 0.0% |
| **OFISI / AFISI (Office)** | **2,708** | 509 | 555 | 1,644 | 18.8% | 20.5% |
| **TUME / KAMISHENI (Commission)** | **7,080** | 593 | 420 | 6,067 | 8.4% | 5.9% |
| **MAMLAKA / WAKALA (Authority / Agency)** | **1,039** | 232 | 5 | 802 | 22.3% | 0.5% |
| **BARAZA / HALMASHAURI (Council)** | **1,761** | 501 | 1,122 | 138 | 28.4% | 63.7% |
| **TAASISI / BODI / CHUO / SHIRIKA (Institute / Board / Corporation)** | **588** | 31 | 48 | 509 | 5.3% | 8.2% |
| **NYINGINE (Other)** | **1,519** | 0 | 13 | 1,506 | 0.0% | 0.9% |
| **TOTAL** | **43,510** | **4,191** | **2,170** | **37,149** | **9.6%** | **5.0%** |

---

## 3. Detailed Institution Breakdown — Island Distribution

| # | Institution | Total | Pemba | Unguja | Unclassified | Pemba % | Unguja % | Classification |
|---|---|---|---|---|---|---|---|---|
| 1 | WIZARA YA ELIMU NA MAFUNZO YA AMALI | 18,978 | 1,681 | 0 | 17,297 | 8.9% | 0.0% | Pemba + unclassified |
| 2 | TUME YA UTUMISHI SERIKALINI | 6,408 | 557 | 420 | 5,431 | 8.7% | 6.6% | Both + unclassified |
| 3 | WIZARA YA AFYA | 6,055 | 2 | 0 | 6,053 | 0.0% | 0.0% | Pemba + unclassified |
| 4 | WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO | 1,677 | 359 | 1 | 1,317 | 21.4% | 0.1% | Both + unclassified |
| 5 | Hospitali ya Mnazi Mmoja | 1,519 | 0 | 13 | 1,506 | 0.0% | 0.9% | Unguja + unclassified |
| 6 | Wakala wa Barabara | 497 | 171 | 1 | 325 | 34.4% | 0.2% | Both + unclassified |
| 7 | Ofisi ya Mhasibu Mkuu wa Serikali | 473 | 130 | 1 | 342 | 27.5% | 0.2% | Both + unclassified |
| 8 | Baraza la Manispaa Mjini Unguja | 426 | 0 | 426 | 0 | 0.0% | 100.0% | Unguja only |
| 9 | WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO | 426 | 69 | 0 | 357 | 16.2% | 0.0% | Pemba + unclassified |
| 10 | WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO | 338 | 0 | 2 | 336 | 0.0% | 0.6% | Unguja + unclassified |
| 11 | WIZARA YA UCHUMI WA BULUU NA UVUVI | 336 | 63 | 0 | 273 | 18.8% | 0.0% | Pemba + unclassified |
| 12 | Taasisi ya Utafiti wa Uvuvi (ZAFIRI) | 330 | 10 | 47 | 273 | 3.0% | 14.2% | Both + unclassified |
| 13 | OFISI YA RAIS - IKULU | 329 | 80 | 157 | 92 | 24.3% | 47.7% | Both + unclassified |
| 14 | OFISI YA MAKAMO WA PILI WA RAISI | 321 | 56 | 1 | 264 | 17.4% | 0.3% | Both + unclassified |
| 15 | WIZARA YA UTALII NA MAMBO YA KALE | 310 | 52 | 0 | 258 | 16.8% | 0.0% | Pemba + unclassified |
| 16 | WIZARA YA MAJI NISHATI NA MADINI | 215 | 5 | 0 | 210 | 2.3% | 0.0% | Pemba + unclassified |
| 17 | WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI | 211 | 32 | 0 | 179 | 15.2% | 0.0% | Pemba + unclassified |
| 18 | OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA | 209 | 1 | 208 | 0 | 0.5% | 99.5% | Both islands |
| 19 | KAMISHENI YA ARDHI ZANZIBAR | 191 | 4 | 0 | 187 | 2.1% | 0.0% | Pemba + unclassified |
| 20 | Baraza la Mji Chake Chake | 185 | 185 | 0 | 0 | 100.0% | 0.0% | Pemba only |
| 21 | OFISI YA MAKAMO WA KWANZA WA RAISI | 171 | 49 | 0 | 122 | 28.7% | 0.0% | Pemba + unclassified |
| 22 | OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ | 161 | 34 | 5 | 122 | 21.1% | 3.1% | Both + unclassified |
| 23 | Baraza la Manispaa Magharibi B | 160 | 0 | 160 | 0 | 0.0% | 100.0% | Unguja only |
| 24 | WAKALA WA MAJENGO ZANZIBAR | 151 | 47 | 1 | 103 | 31.1% | 0.7% | Both + unclassified |
| 25 | OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI | 150 | 0 | 0 | 150 | 0.0% | 0.0% | Unclassified only |
| 26 | AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI | 149 | 30 | 0 | 119 | 20.1% | 0.0% | Pemba + unclassified |
| 27 | Baraza la Mji Kaskazini A Unguja | 147 | 0 | 147 | 0 | 0.0% | 100.0% | Unguja only |
| 28 | AFISI YA MKURUGENZI WA MASHTAKA | 147 | 27 | 0 | 120 | 18.4% | 0.0% | Pemba + unclassified |
| 29 | Baraza la Manispaa Magharibi A | 145 | 0 | 145 | 0 | 0.0% | 100.0% | Unguja only |
| 30 | Baraza la Mji Wete | 143 | 143 | 0 | 0 | 100.0% | 0.0% | Pemba only |
| 31 | WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA | 142 | 26 | 4 | 112 | 18.3% | 2.8% | Both + unclassified |
| 32 | Baraza la Mji Kaskazini B Unguja | 138 | 0 | 138 | 0 | 0.0% | 100.0% | Unguja only |
| 33 | Ofisi ya Mkaguzi wa Elimu | 133 | 24 | 0 | 109 | 18.0% | 0.0% | Pemba + unclassified |
| 34 | WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR | 126 | 36 | 0 | 90 | 28.6% | 0.0% | Pemba + unclassified |
| 35 | AFISI YA MWANASHERIA MKUU | 117 | 3 | 0 | 114 | 2.6% | 0.0% | Pemba + unclassified |
| 36 | Tume ya Mipango | 109 | 17 | 0 | 92 | 15.6% | 0.0% | Pemba + unclassified |
| 37 | Wakala wa Matrekta | 103 | 0 | 0 | 103 | 0.0% | 0.0% | Unclassified only |
| 38 | Mamlaka ya Uwezeshaji Wananchi Kiuchumi (ZEA) | 102 | 3 | 1 | 98 | 2.9% | 1.0% | Both + unclassified |
| 39 | Mamlaka ya Serikali Mtandao (eGAZ) | 99 | 10 | 2 | 87 | 10.1% | 2.0% | Both + unclassified |
| 40 | Baraza la Mji Mkoani | 97 | 97 | 0 | 0 | 100.0% | 0.0% | Pemba only |
| 41 | TUME YA UCHAGUZI YA ZANZIBAR | 96 | 0 | 0 | 96 | 0.0% | 0.0% | Unclassified only |
| 42 | Kamisheni ya Kazi | 85 | 0 | 0 | 85 | 0.0% | 0.0% | Unclassified only |
| 43 | Bodi ya Huduma za Maktaba | 85 | 0 | 0 | 85 | 0.0% | 0.0% | Unclassified only |
| 44 | TAASISI YA NYARAKA NA KUMBUKUMBU | 77 | 20 | 1 | 56 | 26.0% | 1.3% | Both + unclassified |
| 45 | Ofisi ya Msajili wa Hazina | 75 | 9 | 0 | 66 | 12.0% | 0.0% | Pemba + unclassified |
| 46 | Baraza la Mitihani | 73 | 9 | 0 | 64 | 12.3% | 0.0% | Pemba + unclassified |
| 47 | TAASISI YA ELIMU ZANZIBAR | 72 | 1 | 0 | 71 | 1.4% | 0.0% | Pemba + unclassified |
| 48 | Ofisi ya Mkuu wa Mkoa wa Kaskazini Unguja | 71 | 0 | 71 | 0 | 0.0% | 100.0% | Unguja only |
| 49 | Halmashauri ya Wilaya ya Micheweni | 65 | 65 | 0 | 0 | 100.0% | 0.0% | Pemba only |
| 50 | Tume ya Ushindani Halali wa Biashara | 64 | 12 | 0 | 52 | 18.8% | 0.0% | Pemba + unclassified |
| 51 | Ofisi ya Mkuu wa Mkoa wa Kusini Unguja | 64 | 0 | 64 | 0 | 0.0% | 100.0% | Unguja only |
| 52 | MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR | 61 | 1 | 0 | 60 | 1.6% | 0.0% | Pemba + unclassified |
| 53 | Halmashauri ya Wilaya ya Kusini Unguja | 59 | 2 | 57 | 0 | 3.4% | 96.6% | Both islands |
| 54 | Baraza la Mji Kati Unguja | 49 | 0 | 49 | 0 | 0.0% | 100.0% | Unguja only |
| 55 | Ofisi ya Mkuu wa Mkoa wa Mjini Magharibi Unguja | 48 | 0 | 48 | 0 | 0.0% | 100.0% | Unguja only |
| 56 | KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR | 46 | 3 | 0 | 43 | 6.5% | 0.0% | Pemba + unclassified |
| 57 | Baraza la Mapinduzi | 44 | 0 | 0 | 44 | 0.0% | 0.0% | Unclassified only |
| 58 | KAMISHENI YA UTUMISHI WA UMMA | 40 | 0 | 0 | 40 | 0.0% | 0.0% | Unclassified only |
| 59 | TUME YA MAADILI YA VIONGOZI WA UMMA | 39 | 0 | 0 | 39 | 0.0% | 0.0% | Unclassified only |
| 60 | Ofisi ya Mkuu wa Mkoa wa Kaskazini Pemba | 34 | 34 | 0 | 0 | 100.0% | 0.0% | Pemba only |
| 61 | Ofisi ya Mkuu wa Mkoa wa Kusini Pemba | 32 | 32 | 0 | 0 | 100.0% | 0.0% | Pemba only |
| 62 | Wakala wa Vipimo Zanzibar | 25 | 0 | 0 | 25 | 0.0% | 0.0% | Unclassified only |
| 63 | Ofisi ya Hatimiliki (COSOZA) | 24 | 0 | 0 | 24 | 0.0% | 0.0% | Unclassified only |
| 64 | Skuli ya Sheria Zanzibar | 24 | 0 | 0 | 24 | 0.0% | 0.0% | Unclassified only |
| 65 | Baraza la Jiji | 21 | 0 | 0 | 21 | 0.0% | 0.0% | Unclassified only |
| 66 | Baraza la Taifa la Biashara | 9 | 0 | 0 | 9 | 0.0% | 0.0% | Unclassified only |
| 67 | KAMISHENI YA UTALII ZANZIBAR | 2 | 0 | 0 | 2 | 0.0% | 0.0% | Unclassified only |
| 68 | WIZARA YA MAJARIBIO | 1 | 0 | 0 | 1 | 0.0% | 0.0% | Unclassified only |
| 69 | MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR | 1 | 0 | 0 | 1 | 0.0% | 0.0% | Unclassified only |

---

### 3.1 Pemba-Only Institutions (100% Pemba)

| # | Institution | Total | Pemba |
|---|---|---|---|
| 1 | Baraza la Mji Chake Chake | 185 | 185 |
| 2 | Baraza la Mji Wete | 143 | 143 |
| 3 | Baraza la Mji Mkoani | 97 | 97 |
| 4 | Halmashauri ya Wilaya ya Micheweni | 65 | 65 |
| 5 | Ofisi ya Mkuu wa Mkoa wa Kaskazini Pemba | 34 | 34 |
| 6 | Ofisi ya Mkuu wa Mkoa wa Kusini Pemba | 32 | 32 |

### 3.2 Unguja-Only Institutions (100% Unguja)

| # | Institution | Total | Unguja |
|---|---|---|---|
| 1 | Baraza la Manispaa Mjini Unguja | 426 | 426 |
| 2 | Baraza la Manispaa Magharibi B | 160 | 160 |
| 3 | Baraza la Mji Kaskazini A Unguja | 147 | 147 |
| 4 | Baraza la Manispaa Magharibi A | 145 | 145 |
| 5 | Baraza la Mji Kaskazini B Unguja | 138 | 138 |
| 6 | Ofisi ya Mkuu wa Mkoa wa Kaskazini Unguja | 71 | 71 |
| 7 | Ofisi ya Mkuu wa Mkoa wa Kusini Unguja | 64 | 64 |
| 8 | Baraza la Mji Kati Unguja | 49 | 49 |
| 9 | Ofisi ya Mkuu wa Mkoa wa Mjini Magharibi Unguja | 48 | 48 |

### 3.3 Both-Island Institutions (Pemba + Unguja detected)

| # | Institution | Total | Pemba | Unguja | Unclassified | Pemba % | Unguja % |
|---|---|---|---|---|---|---|---|
| 1 | TUME YA UTUMISHI SERIKALINI | 6,408 | 557 | 420 | 5,431 | 8.7% | 6.6% |
| 2 | WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO | 1,677 | 359 | 1 | 1,317 | 21.4% | 0.1% |
| 3 | Wakala wa Barabara | 497 | 171 | 1 | 325 | 34.4% | 0.2% |
| 4 | Ofisi ya Mhasibu Mkuu wa Serikali | 473 | 130 | 1 | 342 | 27.5% | 0.2% |
| 5 | Taasisi ya Utafiti wa Uvuvi (ZAFIRI) | 330 | 10 | 47 | 273 | 3.0% | 14.2% |
| 6 | OFISI YA RAIS - IKULU | 329 | 80 | 157 | 92 | 24.3% | 47.7% |
| 7 | OFISI YA MAKAMO WA PILI WA RAISI | 321 | 56 | 1 | 264 | 17.4% | 0.3% |
| 8 | OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA | 209 | 1 | 208 | 0 | 0.5% | 99.5% |
| 9 | OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ | 161 | 34 | 5 | 122 | 21.1% | 3.1% |
| 10 | WAKALA WA MAJENGO ZANZIBAR | 151 | 47 | 1 | 103 | 31.1% | 0.7% |
| 11 | WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA | 142 | 26 | 4 | 112 | 18.3% | 2.8% |
| 12 | Mamlaka ya Uwezeshaji Wananchi Kiuchumi (ZEA) | 102 | 3 | 1 | 98 | 2.9% | 1.0% |
| 13 | Mamlaka ya Serikali Mtandao (eGAZ) | 99 | 10 | 2 | 87 | 10.1% | 2.0% |
| 14 | TAASISI YA NYARAKA NA KUMBUKUMBU | 77 | 20 | 1 | 56 | 26.0% | 1.3% |
| 15 | Halmashauri ya Wilaya ya Kusini Unguja | 59 | 2 | 57 | 0 | 3.4% | 96.6% |

### 3.4 Institutions with Pemba Employees

These institutions have at least 1 employee detected as working in Pemba.

| # | Institution | Total | Pemba | Unguja | Unclassified | Pemba % |
|---|---|---|---|---|---|---|
| 1 | WIZARA YA ELIMU NA MAFUNZO YA AMALI | 18,978 | 1,681 | 0 | 17,297 | 8.9% |
| 2 | TUME YA UTUMISHI SERIKALINI | 6,408 | 557 | 420 | 5,431 | 8.7% |
| 3 | WIZARA YA AFYA | 6,055 | 2 | 0 | 6,053 | 0.0% |
| 4 | WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO | 1,677 | 359 | 1 | 1,317 | 21.4% |
| 5 | Wakala wa Barabara | 497 | 171 | 1 | 325 | 34.4% |
| 6 | Ofisi ya Mhasibu Mkuu wa Serikali | 473 | 130 | 1 | 342 | 27.5% |
| 7 | WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO | 426 | 69 | 0 | 357 | 16.2% |
| 8 | WIZARA YA UCHUMI WA BULUU NA UVUVI | 336 | 63 | 0 | 273 | 18.8% |
| 9 | Taasisi ya Utafiti wa Uvuvi (ZAFIRI) | 330 | 10 | 47 | 273 | 3.0% |
| 10 | OFISI YA RAIS - IKULU | 329 | 80 | 157 | 92 | 24.3% |
| 11 | OFISI YA MAKAMO WA PILI WA RAISI | 321 | 56 | 1 | 264 | 17.4% |
| 12 | WIZARA YA UTALII NA MAMBO YA KALE | 310 | 52 | 0 | 258 | 16.8% |
| 13 | WIZARA YA MAJI NISHATI NA MADINI | 215 | 5 | 0 | 210 | 2.3% |
| 14 | WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI | 211 | 32 | 0 | 179 | 15.2% |
| 15 | OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA | 209 | 1 | 208 | 0 | 0.5% |
| 16 | KAMISHENI YA ARDHI ZANZIBAR | 191 | 4 | 0 | 187 | 2.1% |
| 17 | Baraza la Mji Chake Chake | 185 | 185 | 0 | 0 | 100.0% |
| 18 | OFISI YA MAKAMO WA KWANZA WA RAISI | 171 | 49 | 0 | 122 | 28.7% |
| 19 | OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ | 161 | 34 | 5 | 122 | 21.1% |
| 20 | WAKALA WA MAJENGO ZANZIBAR | 151 | 47 | 1 | 103 | 31.1% |
| 21 | AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI | 149 | 30 | 0 | 119 | 20.1% |
| 22 | AFISI YA MKURUGENZI WA MASHTAKA | 147 | 27 | 0 | 120 | 18.4% |
| 23 | Baraza la Mji Wete | 143 | 143 | 0 | 0 | 100.0% |
| 24 | WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA | 142 | 26 | 4 | 112 | 18.3% |
| 25 | Ofisi ya Mkaguzi wa Elimu | 133 | 24 | 0 | 109 | 18.0% |
| 26 | WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR | 126 | 36 | 0 | 90 | 28.6% |
| 27 | AFISI YA MWANASHERIA MKUU | 117 | 3 | 0 | 114 | 2.6% |
| 28 | Tume ya Mipango | 109 | 17 | 0 | 92 | 15.6% |
| 29 | Mamlaka ya Uwezeshaji Wananchi Kiuchumi (ZEA) | 102 | 3 | 1 | 98 | 2.9% |
| 30 | Mamlaka ya Serikali Mtandao (eGAZ) | 99 | 10 | 2 | 87 | 10.1% |
| 31 | Baraza la Mji Mkoani | 97 | 97 | 0 | 0 | 100.0% |
| 32 | TAASISI YA NYARAKA NA KUMBUKUMBU | 77 | 20 | 1 | 56 | 26.0% |
| 33 | Ofisi ya Msajili wa Hazina | 75 | 9 | 0 | 66 | 12.0% |
| 34 | Baraza la Mitihani | 73 | 9 | 0 | 64 | 12.3% |
| 35 | TAASISI YA ELIMU ZANZIBAR | 72 | 1 | 0 | 71 | 1.4% |
| 36 | Halmashauri ya Wilaya ya Micheweni | 65 | 65 | 0 | 0 | 100.0% |
| 37 | Tume ya Ushindani Halali wa Biashara | 64 | 12 | 0 | 52 | 18.8% |
| 38 | MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR | 61 | 1 | 0 | 60 | 1.6% |
| 39 | Halmashauri ya Wilaya ya Kusini Unguja | 59 | 2 | 57 | 0 | 3.4% |
| 40 | KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR | 46 | 3 | 0 | 43 | 6.5% |
| 41 | Ofisi ya Mkuu wa Mkoa wa Kaskazini Pemba | 34 | 34 | 0 | 0 | 100.0% |
| 42 | Ofisi ya Mkuu wa Mkoa wa Kusini Pemba | 32 | 32 | 0 | 0 | 100.0% |

---

## 4. Detection Source Breakdown

This section shows which field triggered the Pemba classification for detected employees.
An employee may match multiple sources, so the column counts overlap.

| Detection Source | Employees | Examples |
|---|---|---|
| `department` contains "Pemba" | 3,386 | "Ofisi Kuu Pemba", "OFISI YA URATIBU PEMBA", "ZFDA OFISI YA PEMBA" |
| `currentWorkplace` is a Pemba district | 768 | "Wilaya ya Wete", "Baraza la Mji Chake Chake", "Halmashauri ya Wilaya ya Micheweni" |
| `currentReportingOffice` contains "Pemba" | 1,200 | "Ofisi Kuu Pemba", "Vituo vya Utafiti Pemba" |
| `Institution name` is Pemba-specific | 556 | "Ofisi ya Mkuu wa Mkoa wa Kaskazini Pemba", "Ofisi ya Mkuu wa Mkoa wa Kusini Pemba" |
| **Total Pemba-detected (exclusive)** | **4,191** | Each employee counted once (Pemba priority) |

---

## 5. Unclassified Employee Notes

The 37,149 unclassified employees (85.4% of total) are those
whose work-location fields contain no island keyword. Key characteristics:

| Field | Typical Value | Has Island Keyword? |
|---|---|---|
| `currentWorkplace` | "Wizara ya Afya", "Mamlaka ya Maji", "Chuo Kikuu cha Taifa cha Zanzibar" | No |
| `department` | "Idara ya Tiba", "Elimu ya Sekondari", "Idara ya Uendeshaji na Utumishi" | No |
| `currentReportingOffice` | "Idara ya Kinga na Elimu ya Afya", "Idara ya Uendeshaji na Utumishi" | No |

All Zanzibar government ministries are headquartered in Unguja (Stone Town / Mjini Magharibi).
Unclassified employees at ministries are almost certainly based at HQ in **Unguja**, but
some may be posted to Pemba field offices without "Pemba" appearing in their HRIMS department
or workplace data. A definitive classification would require an HRIMS data quality update to
populate the `department` field with "Ofisi Kuu Pemba" for all Pemba-based staff.

> **Recommendation:** Implement the `Island` enum field on the `Employee` model as described
> in the `plan-hro-hrrp-pemba-roles.md` plan. This would store an explicit `island` value
> per employee, derived during HRIMS sync, eliminating the need for keyword-based inference.

---

*Report generated from the CSMS database — Tume ya Utumishi Serikalini, Zanzibar. Data as of August 2026.*
*Island classification uses work-location fields only (department, currentWorkplace, currentReportingOffice, institution name).
Birthplace region is intentionally excluded per the requirement that an employee should be counted by where they work, not where they were born.*