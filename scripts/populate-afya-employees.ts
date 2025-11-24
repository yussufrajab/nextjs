import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to generate random date of birth for various age ranges
function generateDateOfBirth(minAge: number, maxAge: number): Date {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  const minBirthYear = currentYear - maxAge;
  const maxBirthYear = currentYear - minAge;
  
  const birthYear = Math.floor(Math.random() * (maxBirthYear - minBirthYear + 1)) + minBirthYear;
  const birthMonth = Math.floor(Math.random() * 12); // 0-11
  const birthDay = Math.floor(Math.random() * 28) + 1; // 1-28 to avoid month issues
  
  return new Date(birthYear, birthMonth, birthDay);
}

// Function to generate retirement date (60 years after birth)
function generateRetirementDate(dateOfBirth: Date): Date {
  const retirementDate = new Date(dateOfBirth);
  retirementDate.setFullYear(retirementDate.getFullYear() + 60);
  return retirementDate;
}

// Function to generate employment date based on status
function generateEmploymentDate(dateOfBirth: Date, status: string): Date {
  const employmentDate = new Date(dateOfBirth);
  
  if (status === 'Probation') {
    // Recent employees (employed within last 1-2 years)
    const yearsAfterBirth = Math.floor(Math.random() * 15) + 20; // 20-35 years after birth
    employmentDate.setFullYear(employmentDate.getFullYear() + yearsAfterBirth);
    // Make sure employment is recent (last 1-2 years)
    const currentDate = new Date();
    const maxEmploymentDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
    if (employmentDate > maxEmploymentDate) {
      employmentDate.setFullYear(maxEmploymentDate.getFullYear() - Math.floor(Math.random() * 2));
    }
  } else {
    // Older employees for confirmed and other statuses
    const yearsAfterBirth = Math.floor(Math.random() * 10) + 20; // 20-30 years after birth
    employmentDate.setFullYear(employmentDate.getFullYear() + yearsAfterBirth);
  }
  
  return employmentDate;
}

// Function to generate confirmation date based on status
function generateConfirmationDate(employmentDate: Date, status: string): Date | null {
  if (status === 'Probation') {
    return null; // No confirmation date for probation employees
  }
  
  const confirmationDate = new Date(employmentDate);
  const yearsAfter = Math.floor(Math.random() * 3) + 1; // 1-3 years after employment
  confirmationDate.setFullYear(confirmationDate.getFullYear() + yearsAfter);
  return confirmationDate;
}

// Generate unique numeric ZAN ID (10 digits)
function generateZanId(): string {
  return `19${String(Math.floor(Math.random() * 90) + 10)}${String(Math.floor(Math.random() * 900000) + 100000).slice(0, 6)}`;
}

// Health sector specific names
const healthWorkerNames = [
  // Doctors
  'Dkt. Amina Hassan Khamis', 'Dkt. Omar Said Juma', 'Dkt. Fatma Ali Bakari',
  'Dkt. Hassan Mohamed Omar', 'Dkt. Zeinab Khamis Said', 'Dkt. Salim Juma Hassan',
  'Dkt. Mariam Bakari Ali', 'Dkt. Rashid Omar Khamis', 'Dkt. Halima Said Mohamed',
  
  // Nurses
  'Muuguzi Asha Mohamed Ali', 'Muuguzi Juma Khamis Omar', 'Muuguzi Saida Hassan Bakari',
  'Muuguzi Ali Said Hassan', 'Muuguzi Mwanaisha Juma Khamis', 'Muuguzi Omar Bakari Said',
  'Muuguzi Fatuma Ali Hassan', 'Muuguzi Hassan Khamis Juma', 'Muuguzi Rehema Said Ali',
  
  // Health Officers & Other Health Workers
  'Afisa Afya Bakari Hassan', 'Afisa Afya Amina Said', 'Afisa Afya Omar Juma',
  'Fundi Maabara Salim Hassan', 'Fundi Maabara Fatma Khamis', 'Fundi Maabara Ali Said',
  'Mhunzi wa Mifumo Hassan Omar', 'Mhunzi wa Mifumo Zeinab Ali', 'Mhunzi wa Mifumo Said Hassan',
  
  // Administrative & Support Staff
  'Katibu Msaidizi Amina Hassan', 'Katibu Msaidizi Omar Said', 'Msimamizi Halima Juma',
  'Msimamizi Ali Hassan', 'Askari Usalama Hassan Said', 'Dereva Ambulensi Omar Khamis',
  'Msafishaji Fatma Hassan', 'Mpishi Hospitali Amina Said', 'Askari Usalama Juma Hassan'
];

// Health sector specific cadres
const healthCadres = [
  // Medical Staff
  'Daktari Mkuu', 'Daktari Msaidizi', 'Afisa Afya Mkuu', 'Afisa Afya',
  'Muuguzi Mkuu', 'Muuguzi Msaidizi', 'Muuguzi wa Jamii',
  'Mfuatiliaji wa Afya', 'Mtaalamu wa Maabara', 'Fundi Maabara',
  
  // Specialized Medical
  'Daktari wa Watoto', 'Daktari wa Wanawake', 'Daktari wa Mifupa',
  'Daktari wa Macho', 'Daktari wa Meno', 'Daktari wa Akili',
  'Mtaalamu wa Upasuaji', 'Mtaalamu wa Radiology', 'Mtaalamu wa Pharmacy',
  
  // Administrative & Support
  'Mkuu wa Idara ya Afya', 'Makamu Mkuu wa Afya', 'Afisa Utendaji wa Afya',
  'Katibu Msaidizi', 'Msimamizi wa Hospitali', 'Afisa Fedha wa Afya',
  'Afisa Rasilimali wa Afya', 'Askari Usalama', 'Dereva Ambulensi',
  'Msafishaji wa Hospitali', 'Mpishi wa Hospitali'
];

// Health sector departments
const healthDepartments = [
  'Idara ya Huduma za Msingi za Afya', 'Idara ya Hospitali za Rufaa',
  'Idara ya Afya ya Mama na Mtoto', 'Idara ya Magonjwa Yasiyo ya Kuambukiza',
  'Idara ya Kudhibiti Magonjwa', 'Idara ya Afya ya Mazingira',
  'Idara ya Dawa na Vifaa vya Matibabu', 'Idara ya Utafiti wa Kiafya',
  'Idara ya Elimu ya Afya', 'Idara ya Mipango na Takwimu za Afya'
];

const salaryScales = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2'];

const regions = [
  'Wilaya ya Mjini Magharibi', 'Wilaya ya Kusini Unguja', 'Wilaya ya Kaskazini Unguja',
  'Wilaya ya Kaskazini Pemba', 'Wilaya ya Kusini Pemba'
];

// Institution ID for Wizara ya Afya
const WIZARA_YA_AFYA_ID = 'cmd06nn7u0003e67wa4hiyie7';

// Employee statuses with counts
const employeeGroups = [
  { status: 'Probation', count: 10, ageRange: [25, 35] },
  { status: 'Confirmed', count: 15, ageRange: [30, 55] },
  { status: 'On Leave', count: 3, ageRange: [35, 50] },
  { status: 'On LWOP', count: 2, ageRange: [40, 55] },
  { status: 'Suspended', count: 2, ageRange: [30, 45] },
  { status: 'Transferred', count: 2, ageRange: [35, 50] },
  { status: 'Active', count: 1, ageRange: [45, 55] }
];

async function populateAfyaEmployees() {
  console.log('Starting to populate Wizara ya Afya employees...');
  
  try {
    let nameIndex = 0;
    const employees = [];
    
    for (const group of employeeGroups) {
      console.log(`\n📋 Creating ${group.count} employees with status: ${group.status}`);
      
      for (let i = 0; i < group.count; i++) {
        const name = healthWorkerNames[nameIndex % healthWorkerNames.length];
        nameIndex++;
        
        const gender = Math.random() > 0.5 ? 'Male' : 'Female';
        const dateOfBirth = generateDateOfBirth(group.ageRange[0], group.ageRange[1]);
        const employmentDate = generateEmploymentDate(dateOfBirth, group.status);
        const confirmationDate = generateConfirmationDate(employmentDate, group.status);
        const retirementDate = generateRetirementDate(dateOfBirth);
        
        // Generate unique ZAN ID with retry logic for uniqueness
        let zanId = generateZanId();
        let attempts = 0;
        while (attempts < 10) {
          try {
            const existing = await prisma.employee.findUnique({
              where: { zanId }
            });
            if (!existing) break;
            zanId = generateZanId();
            attempts++;
          } catch (error) {
            break; // If there's an error checking, proceed with current zanId
          }
        }
        
        const employee = {
          name,
          gender,
          dateOfBirth,
          placeOfBirth: regions[Math.floor(Math.random() * regions.length)],
          region: regions[Math.floor(Math.random() * regions.length)],
          countryOfBirth: 'Tanzania',
          zanId,
          phoneNumber: `+255 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`,
          contactAddress: `P.O. Box ${Math.floor(Math.random() * 9000) + 1000}, Stone Town, Zanzibar`,
          zssfNumber: `ZSSF${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 100)}`,
          payrollNumber: `PAY${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 100)}`,
          cadre: healthCadres[Math.floor(Math.random() * healthCadres.length)],
          salaryScale: salaryScales[Math.floor(Math.random() * salaryScales.length)],
          ministry: 'Wizara ya Afya',
          department: healthDepartments[Math.floor(Math.random() * healthDepartments.length)],
          appointmentType: group.status === 'Probation' ? 'Temporary' : 'Permanent',
          contractType: group.status === 'Probation' ? 'Probationary Contract' : 'Permanent Contract',
          employmentDate,
          confirmationDate,
          retirementDate,
          status: group.status,
          institutionId: WIZARA_YA_AFYA_ID
        };
        
        employees.push(employee);
      }
    }
    
    // Insert employees into database
    let successCount = 0;
    let failCount = 0;
    
    for (const employee of employees) {
      try {
        await prisma.employee.create({
          data: employee
        });
        console.log(`✅ Created employee: ${employee.name} (Status: ${employee.status}, Age: ${new Date().getFullYear() - employee.dateOfBirth.getFullYear()} years)`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed to create employee: ${employee.name}`, error.message);
        failCount++;
      }
    }
    
    console.log(`\n🎉 Successfully populated Wizara ya Afya employees!`);
    
    // Display summary
    console.log('\n📊 Summary:');
    console.log(`- Total employees added: ${successCount}`);
    console.log(`- Failed creations: ${failCount}`);
    console.log(`- Institution: Wizara ya Afya (Ministry of Health)`);
    
    console.log('\n📋 Status Distribution:');
    for (const group of employeeGroups) {
      console.log(`- ${group.status}: ${group.count} employees`);
    }
    
    console.log('\n🏥 Department Coverage:');
    console.log('- Primary Health Services');
    console.log('- Referral Hospitals');
    console.log('- Maternal & Child Health');
    console.log('- Disease Control');
    console.log('- Environmental Health');
    console.log('- Pharmacy & Medical Supplies');
    console.log('- Health Research & Education');
    
  } catch (error) {
    console.error('Error populating Afya employees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateAfyaEmployees().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});