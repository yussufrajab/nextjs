import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to generate random date of birth for employees nearing retirement (59.5+ years)
function generateRetirementDateOfBirth(): Date {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Calculate birth year for someone who is 59.5 to 65 years old
  const minBirthYear = currentYear - 65; // 65 years old
  const maxBirthYear = currentYear - 59; // 59 years old (closer to 60)
  
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

// Function to generate employment date (20-40 years ago)
function generateEmploymentDate(dateOfBirth: Date): Date {
  const employmentDate = new Date(dateOfBirth);
  const yearsAfterBirth = Math.floor(Math.random() * 10) + 20; // 20-30 years after birth
  employmentDate.setFullYear(employmentDate.getFullYear() + yearsAfterBirth);
  return employmentDate;
}

// Function to generate confirmation date (1-3 years after employment)
function generateConfirmationDate(employmentDate: Date): Date {
  const confirmationDate = new Date(employmentDate);
  const yearsAfter = Math.floor(Math.random() * 3) + 1; // 1-3 years after employment
  confirmationDate.setFullYear(confirmationDate.getFullYear() + yearsAfter);
  return confirmationDate;
}

const swahiliNames = [
  'Mwalimu Hassan Juma', 'Bi. Fatuma Khamis Said', 'Mheshimiwa Omar Abdulla',
  'Dkt. Amina Mohamed Ali', 'Mwalimu Salim Bakari', 'Bi. Zeinab Hamad',
  'Mheshimiwa Juma Maulidi', 'Dkt. Mariam Seif', 'Mwalimu Rashid Kombo',
  'Bi. Halima Juma', 'Mheshimiwa Ali Hassan', 'Dkt. Khadija Omar',
  'Mwalimu Bakari Salim', 'Bi. Mwanaisha Said', 'Mheshimiwa Hamza Khamis',
  'Dkt. Rehema Abdulla', 'Mwalimu Seif Ali', 'Bi. Saada Mohamed',
  'Mheshimiwa Nassor Juma', 'Dkt. Asha Bakari'
];

const cadres = [
  'Mkuu wa Wilaya', 'Afisa Utendaji', 'Mkuu wa Idara', 'Makamu Mkuu wa Idara',
  'Afisa Uwongozi', 'Afisa Mkuu', 'Afisa Msaidizi Mkuu', 'Afisa Elimu',
  'Afisa Afya', 'Afisa Fedha', 'Afisa Mipango', 'Afisa Rasilimali',
  'Mwalimu Mkuu', 'Daktari Mkuu', 'Muhandisi Mkuu'
];

const salaryScales = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];

const regions = [
  'Wilaya ya Mjini Magharibi', 'Wilaya ya Kusini Unguja', 'Wilaya ya Kaskazini Unguja',
  'Wilaya ya Kaskazini Pemba', 'Wilaya ya Kusini Pemba', 'Wilaya ya Mjini Magharibi'
];

const departments = [
  'Idara ya Elimu', 'Idara ya Afya', 'Idara ya Fedha', 'Idara ya Mipango',
  'Idara ya Rasilimali Watu', 'Idara ya Mazingira', 'Idara ya Kilimo',
  'Idara ya Utalii', 'Idara ya Mawasiliano', 'Idara ya Uchukuzi'
];

// Institution IDs from the database
const institutionIds = [
  'cmd059ion0000e6d85kexfukl', // TUME YA UTUMISHI SERIKALINI
  'cmd06nn7n0001e67w2h5rf86x', // OFISI YA RAIS, FEDHA NA MIPANGO
  'cmd06nn7r0002e67w8df8thtn', // WIZARA YA ELIMU NA MAFUNZO YA AMALI
  'cmd06nn7u0003e67wa4hiyie7', // WIZARA YA AFYA
  'cmd06xe1x0000e6bqalx28nja', // Ofisi ya Msajili wa Hazina
  'cmd06xe220001e6bqj26tnlsj', // Ofisi ya Mkuu wa Mkoa wa Kusini Unguja
  'cmd06xe250002e6bqp8aabk92', // Wakala wa Vipimo Zanzibar
  'cmd06xe270003e6bq0wm0v3c7', // WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO
  'cmd06xe2a0004e6bqwbtjm4x9', // KAMISHENI YA UTUMISHI WA UMMA
  'cmd06xe2c0005e6bqulk6iu8g'  // WAKALA WA SERIKALI MTANDAO (eGAZ)
];

async function populateMockEmployees() {
  console.log('Starting to populate mock employees...');
  
  try {
    const employees = [];
    
    for (let i = 0; i < 15; i++) {
      const name = swahiliNames[Math.floor(Math.random() * swahiliNames.length)];
      const gender = Math.random() > 0.5 ? 'Male' : 'Female';
      const dateOfBirth = generateRetirementDateOfBirth();
      const employmentDate = generateEmploymentDate(dateOfBirth);
      const confirmationDate = generateConfirmationDate(employmentDate);
      const retirementDate = generateRetirementDate(dateOfBirth);
      
      // Generate unique ZAN ID (10 digits, numbers only)
      const zanId = `19${String(Math.floor(Math.random() * 90) + 10)}${String(Math.floor(Math.random() * 900000) + 100000).slice(0, 6)}`;
      
      const employee = {
        name,
        gender,
        dateOfBirth,
        placeOfBirth: regions[Math.floor(Math.random() * regions.length)],
        region: regions[Math.floor(Math.random() * regions.length)],
        countryOfBirth: 'Tanzania',
        zanId,
        phoneNumber: `+255 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`,
        contactAddress: `P.O. Box ${Math.floor(Math.random() * 9000) + 1000}, Zanzibar`,
        zssfNumber: `ZSSF${String(Date.now()).slice(-6)}${i}`,
        payrollNumber: `PAY${String(Date.now()).slice(-6)}${i}`,
        cadre: cadres[Math.floor(Math.random() * cadres.length)],
        salaryScale: salaryScales[Math.floor(Math.random() * salaryScales.length)],
        ministry: 'Wizara ya Utumishi wa Umma',
        department: departments[Math.floor(Math.random() * departments.length)],
        appointmentType: 'Permanent',
        contractType: 'Permanent Contract',
        employmentDate,
        confirmationDate,
        retirementDate,
        status: 'Active',
        institutionId: institutionIds[Math.floor(Math.random() * institutionIds.length)]
      };
      
      employees.push(employee);
    }
    
    // Insert employees into database
    for (const employee of employees) {
      try {
        await prisma.employee.create({
          data: employee
        });
        console.log(`✅ Created employee: ${employee.name} (Age: ${new Date().getFullYear() - employee.dateOfBirth.getFullYear()} years)`);
      } catch (error: any) {
        console.error(`❌ Failed to create employee: ${employee.name}`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully populated ${employees.length} mock employees nearing retirement!`);
    
    // Display summary
    console.log('\n📊 Summary:');
    console.log(`- Total employees added: ${employees.length}`);
    console.log(`- Age range: 59-65 years old`);
    console.log(`- Gender distribution: Mixed`);
    console.log(`- Status: All Active`);
    console.log(`- Contract Type: Permanent`);
    
  } catch (error) {
    console.error('Error populating mock employees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateMockEmployees().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});