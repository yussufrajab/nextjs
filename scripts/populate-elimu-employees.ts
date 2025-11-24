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

// Education sector specific names
const educationWorkerNames = [
  // Teachers (Primary & Secondary)
  'Mwalimu Amina Hassan Khamis', 'Mwalimu Omar Said Juma', 'Mwalimu Fatma Ali Bakari',
  'Mwalimu Hassan Mohamed Omar', 'Mwalimu Zeinab Khamis Said', 'Mwalimu Salim Juma Hassan',
  'Mwalimu Mariam Bakari Ali', 'Mwalimu Rashid Omar Khamis', 'Mwalimu Halima Said Mohamed',
  
  // Headteachers & School Leaders
  'Mwalimu Mkuu Asha Mohamed Ali', 'Mwalimu Mkuu Juma Khamis Omar', 'Mwalimu Mkuu Saida Hassan Bakari',
  'Mwalimu Mkuu Ali Said Hassan', 'Mwalimu Mkuu Mwanaisha Juma', 'Mwalimu Mkuu Omar Bakari Said',
  
  // Education Officers & Inspectors
  'Afisa Elimu Bakari Hassan', 'Afisa Elimu Amina Said', 'Afisa Elimu Omar Juma',
  'Mkaguzi Elimu Salim Hassan', 'Mkaguzi Elimu Fatma Khamis', 'Mkaguzi Elimu Ali Said',
  
  // Curriculum & Training Specialists
  'Mtaalamu Mitaala Hassan Omar', 'Mtaalamu Mitaala Zeinab Ali', 'Mtaalamu Mitaala Said Hassan',
  'Mhadhiri Amina Hassan', 'Mhadhiri Omar Said', 'Mhadhiri Halima Juma',
  
  // Administrative & Support Staff
  'Katibu Shule Amina Hassan', 'Katibu Shule Omar Said', 'Msimamizi Shule Halima Juma',
  'Msimamizi Shule Ali Hassan', 'Askari Shule Hassan Said', 'Mpishi Shule Omar Khamis',
  'Msafishaji Shule Fatma Hassan', 'Dereva Basi la Shule Amina Said', 'Maktaba Hassan Juma'
];

// Education sector specific cadres
const educationCadres = [
  // Teaching Staff
  'Mwalimu Mkuu', 'Mwalimu Msaidizi', 'Mwalimu wa Msingi', 'Mwalimu wa Sekondari',
  'Mwalimu wa Chekechea', 'Mwalimu wa Ujuzi', 'Mwalimu wa Hisabati',
  'Mwalimu wa Sayansi', 'Mwalimu wa Kiingereza', 'Mwalimu wa Kiswahili',
  
  // School Leadership
  'Mkuu wa Shule ya Msingi', 'Mkuu wa Shule ya Sekondari', 'Makamu Mkuu wa Shule',
  'Mwalimu Mkuu wa Kata', 'Afisa Elimu wa Wilaya', 'Mkuu wa Idara ya Elimu',
  
  // Education Officers & Inspectors
  'Afisa Elimu Mkuu', 'Afisa Elimu', 'Mkaguzi wa Elimu', 'Mshauri wa Elimu',
  'Afisa Mitaala', 'Afisa Utafiti wa Elimu', 'Afisa Mafunzo ya Walimu',
  
  // Administrative & Support
  'Katibu Msaidizi wa Shule', 'Msimamizi wa Shule', 'Afisa Fedha wa Elimu',
  'Afisa Rasilimali wa Elimu', 'Askari wa Shule', 'Mpishi wa Shule',
  'Msafishaji wa Shule', 'Maktaba', 'Dereva wa Shule'
];

// Education sector departments
const educationDepartments = [
  'Idara ya Elimu ya Msingi', 'Idara ya Elimu ya Sekondari',
  'Idara ya Elimu ya Mapema', 'Idara ya Mafunzo ya Ujuzi',
  'Idara ya Mitaala na Vifaa vya Kufundishia', 'Idara ya Ukaguzi wa Elimu',
  'Idara ya Mafunzo ya Walimu', 'Idara ya Utafiti wa Elimu',
  'Idara ya Takwimu za Elimu', 'Idara ya Majengo ya Shule',
  'Idara ya Elimu Maalumu', 'Idara ya Teknolojia ya Habari Elimu',
  'Idara ya Mahusiano ya Kimataifa', 'Idara ya Fedha na Mipango'
];

const salaryScales = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2'];

const regions = [
  'Wilaya ya Mjini Magharibi', 'Wilaya ya Kusini Unguja', 'Wilaya ya Kaskazini Unguja',
  'Wilaya ya Kaskazini Pemba', 'Wilaya ya Kusini Pemba'
];

// Institution ID for Wizara ya Elimu na Mafunzo ya Amali
const WIZARA_YA_ELIMU_ID = 'cmd06nn7r0002e67w8df8thtn';

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

async function populateElimuEmployees() {
  console.log('Starting to populate Wizara ya Elimu na Mafunzo ya Amali employees...');
  
  try {
    let nameIndex = 0;
    const employees = [];
    
    for (const group of employeeGroups) {
      console.log(`\n📚 Creating ${group.count} employees with status: ${group.status}`);
      
      for (let i = 0; i < group.count; i++) {
        const name = educationWorkerNames[nameIndex % educationWorkerNames.length];
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
          cadre: educationCadres[Math.floor(Math.random() * educationCadres.length)],
          salaryScale: salaryScales[Math.floor(Math.random() * salaryScales.length)],
          ministry: 'Wizara ya Elimu na Mafunzo ya Amali',
          department: educationDepartments[Math.floor(Math.random() * educationDepartments.length)],
          appointmentType: group.status === 'Probation' ? 'Temporary' : 'Permanent',
          contractType: group.status === 'Probation' ? 'Probationary Contract' : 'Permanent Contract',
          employmentDate,
          confirmationDate,
          retirementDate,
          status: group.status,
          institutionId: WIZARA_YA_ELIMU_ID
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
    
    console.log(`\n🎉 Successfully populated Wizara ya Elimu na Mafunzo ya Amali employees!`);
    
    // Display summary
    console.log('\n📊 Summary:');
    console.log(`- Total employees added: ${successCount}`);
    console.log(`- Failed creations: ${failCount}`);
    console.log(`- Institution: Wizara ya Elimu na Mafunzo ya Amali (Ministry of Education & Vocational Training)`);
    
    console.log('\n📋 Status Distribution:');
    for (const group of employeeGroups) {
      console.log(`- ${group.status}: ${group.count} employees`);
    }
    
    console.log('\n🏫 Department Coverage:');
    console.log('- Primary Education');
    console.log('- Secondary Education');
    console.log('- Early Childhood Education');
    console.log('- Vocational Training');
    console.log('- Curriculum Development');
    console.log('- Education Inspection');
    console.log('- Teacher Training');
    console.log('- Educational Research');
    console.log('- Special Education');
    console.log('- Education Technology');
    
  } catch (error) {
    console.error('Error populating Elimu employees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateElimuEmployees().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});