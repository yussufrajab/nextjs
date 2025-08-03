const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

// Comprehensive employee data
const COMPREHENSIVE_EMPLOYEES = [
  // Finance & Administration
  { name: "Mwalimu Hassan Khamis", gender: "Male", zanId: "1905800010", cadre: "Principal Secretary", department: "Administration", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "OFISI YA RAIS, FEDHA NA MIPANGO" },
  { name: "Dr. Fatma Ali Mohamed", gender: "Female", zanId: "1904750020", cadre: "Deputy Principal Secretary", department: "Finance", salaryScale: "ZPS 7.2", status: "Confirmed", institution: "OFISI YA RAIS, FEDHA NA MIPANGO" },
  { name: "Said Juma Nassor", gender: "Male", zanId: "1905850030", cadre: "Director of Finance", department: "Finance", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "OFISI YA RAIS, FEDHA NA MIPANGO" },
  { name: "Mwanasha Saleh Omar", gender: "Female", zanId: "1906900040", cadre: "Assistant Director", department: "Budget", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "OFISI YA RAIS, FEDHA NA MIPANGO" },
  { name: "Ahmed Khamis Vuai", gender: "Male", zanId: "1907880050", cadre: "Senior Administrative Officer", department: "Human Resources", salaryScale: "ZPS 4.2", status: "On Probation", institution: "OFISI YA RAIS, FEDHA NA MIPANGO" },
  { name: "Zeinab Mohammed Ali", gender: "Female", zanId: "1908920060", cadre: "Administrative Officer", department: "Registry", salaryScale: "ZPS 4.1", status: "Confirmed", institution: "OFISI YA RAIS, FEDHA NA MIPANGO" },
  
  // Education
  { name: "Prof. Omar Juma Khamis", gender: "Male", zanId: "1905650070", cadre: "Principal Secretary", department: "Policy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA ELIMU NA MAFUNZO YA AMALI" },
  { name: "Dr. Amina Hassan Said", gender: "Female", zanId: "1906720080", cadre: "Director of Education", department: "Primary Education", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA ELIMU NA MAFUNZO YA AMALI" },
  { name: "Hamad Ali Khamis", gender: "Male", zanId: "1907800090", cadre: "Senior Education Officer", department: "Secondary Education", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "WIZARA YA ELIMU NA MAFUNZO YA AMALI" },
  { name: "Mwalimu Fatuma Juma", gender: "Female", zanId: "1908850100", cadre: "Education Officer", department: "Curriculum", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "WIZARA YA ELIMU NA MAFUNZO YA AMALI" },
  { name: "Rashid Mohammed Omar", gender: "Male", zanId: "1909900110", cadre: "Education Officer", department: "Teacher Training", salaryScale: "ZPS 4.1", status: "On Probation", institution: "WIZARA YA ELIMU NA MAFUNZO YA AMALI" },
  { name: "Halima Said Ali", gender: "Female", zanId: "1910950120", cadre: "Assistant Education Officer", department: "Special Education", salaryScale: "ZPS 3.2", status: "Confirmed", institution: "WIZARA YA ELIMU NA MAFUNZO YA AMALI" },
  
  // Health
  { name: "Dr. Mwalimu Hassan Omar", gender: "Male", zanId: "1906700130", cadre: "Principal Secretary", department: "Health Policy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA AFYA" },
  { name: "Dr. Khadija Ali Mohamed", gender: "Female", zanId: "1907750140", cadre: "Chief Medical Officer", department: "Clinical Services", salaryScale: "ZPS 7.1", status: "Confirmed", institution: "WIZARA YA AFYA" },
  { name: "Daktari Salim Juma Said", gender: "Male", zanId: "1908800150", cadre: "Medical Officer", department: "Public Health", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "WIZARA YA AFYA" },
  { name: "Nurse Mwanasha Hassan", gender: "Female", zanId: "1909850160", cadre: "Senior Nursing Officer", department: "Nursing Services", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "WIZARA YA AFYA" },
  { name: "Pharmacist Ahmed Ali", gender: "Male", zanId: "1910900170", cadre: "Principal Pharmacist", department: "Pharmacy", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "WIZARA YA AFYA" },
  { name: "Fatma Khamis Omar", gender: "Female", zanId: "1911950180", cadre: "Health Officer", department: "Health Promotion", salaryScale: "ZPS 4.1", status: "On Probation", institution: "WIZARA YA AFYA" },
  
  // Commission
  { name: "Mhe. Ali Mohamed Khamis", gender: "Male", zanId: "1905600190", cadre: "Commissioner", department: "Executive", salaryScale: "ZPS 9.1", status: "Confirmed", institution: "TUME YA UTUMISHI SERIKALINI" },
  { name: "Dr. Mwanajuma Said Ali", gender: "Female", zanId: "1906650200", cadre: "Secretary General", department: "Administration", salaryScale: "ZPS 8.2", status: "Confirmed", institution: "TUME YA UTUMISHI SERIKALINI" },
  { name: "Mwalimu Hassan Juma", gender: "Male", zanId: "1907700210", cadre: "Director of HR", department: "Human Resources", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "TUME YA UTUMISHI SERIKALINI" },
  { name: "Zeinab Ali Hassan", gender: "Female", zanId: "1908750220", cadre: "Legal Officer", department: "Legal Affairs", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "TUME YA UTUMISHI SERIKALINI" },
  
  // Agriculture
  { name: "Dr. Juma Ali Khamis", gender: "Male", zanId: "1905750230", cadre: "Principal Secretary", department: "Policy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO" },
  { name: "Agronomist Fatma Said", gender: "Female", zanId: "1906800240", cadre: "Director of Agriculture", department: "Crop Production", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO" },
  { name: "Veterinarian Ahmed Hassan", gender: "Male", zanId: "1907850250", cadre: "Chief Veterinary Officer", department: "Animal Health", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO" },
  { name: "Mwanasha Juma Omar", gender: "Female", zanId: "1908900260", cadre: "Agricultural Officer", department: "Extension Services", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO" },
  
  // Infrastructure
  { name: "Engineer Said Hassan", gender: "Male", zanId: "1905820270", cadre: "Principal Secretary", department: "Infrastructure", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI" },
  { name: "Engineer Amina Ali", gender: "Female", zanId: "1906870280", cadre: "Chief Engineer", department: "Roads", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI" },
  { name: "Architect Omar Juma", gender: "Male", zanId: "1907920290", cadre: "Senior Architect", department: "Building", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI" },
  { name: "Surveyor Mwanajuma Hassan", gender: "Female", zanId: "1908970300", cadre: "Senior Surveyor", department: "Survey", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI" },
  
  // Tourism
  { name: "Mwalimu Hassan Said", gender: "Male", zanId: "1905840310", cadre: "Principal Secretary", department: "Tourism Policy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA UTALII NA MAMBO YA KALE" },
  { name: "Dr. Fatma Juma Ali", gender: "Female", zanId: "1906890320", cadre: "Director of Tourism", department: "Tourism Development", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA UTALII NA MAMBO YA KALE" },
  { name: "Ahmed Omar Hassan", gender: "Male", zanId: "1907940330", cadre: "Tourism Officer", department: "Heritage", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "WIZARA YA UTALII NA MAMBO YA KALE" },
  
  // Water & Energy
  { name: "Engineer Ali Hassan", gender: "Male", zanId: "1905860340", cadre: "Principal Secretary", department: "Water Policy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA MAJI NISHATI NA MADINI" },
  { name: "Engineer Zeinab Omar", gender: "Female", zanId: "1906910350", cadre: "Director of Water", department: "Water Supply", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA MAJI NISHATI NA MADINI" },
  { name: "Technician Said Ali", gender: "Male", zanId: "1907960360", cadre: "Senior Technician", department: "Energy", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "WIZARA YA MAJI NISHATI NA MADINI" },
  
  // Industry & Trade
  { name: "Economist Juma Hassan", gender: "Male", zanId: "1905880370", cadre: "Principal Secretary", department: "Trade Policy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA" },
  { name: "MBA Mwanasha Said", gender: "Female", zanId: "1906930380", cadre: "Director of Industry", department: "Industrial Development", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA" },
  { name: "Trade Officer Ahmed", gender: "Male", zanId: "1907980390", cadre: "Trade Officer", department: "Export Promotion", salaryScale: "ZPS 4.2", status: "On Probation", institution: "WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA" },
  
  // Land & Housing
  { name: "Surveyor Hassan Ali", gender: "Male", zanId: "1905900400", cadre: "Principal Secretary", department: "Land Policy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR" },
  { name: "Architect Fatma Hassan", gender: "Female", zanId: "1906950410", cadre: "Director of Housing", department: "Housing Development", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR" },
  { name: "Land Officer Omar Said", gender: "Male", zanId: "1908000420", cadre: "Land Officer", department: "Land Administration", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR" },
  
  // Information & Youth
  { name: "Journalist Ali Omar", gender: "Male", zanId: "1905920430", cadre: "Principal Secretary", department: "Information Policy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO" },
  { name: "Dr. Mwanajuma Ali", gender: "Female", zanId: "1906970440", cadre: "Director of Youth", department: "Youth Development", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO" },
  { name: "Sports Officer Hassan", gender: "Male", zanId: "1908020450", cadre: "Sports Officer", department: "Sports", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO" },
  
  // Blue Economy
  { name: "Marine Biologist Said", gender: "Male", zanId: "1905940460", cadre: "Principal Secretary", department: "Blue Economy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA UCHUMI WA BULUU NA UVUVI" },
  { name: "Dr. Amina Juma", gender: "Female", zanId: "1906990470", cadre: "Director of Fisheries", department: "Fisheries", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA UCHUMI WA BULUU NA UVUVI" },
  { name: "Fisheries Officer Omar", gender: "Male", zanId: "1908040480", cadre: "Fisheries Officer", department: "Marine Resources", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "WIZARA YA UCHUMI WA BULUU NA UVUVI" },
  
  // Social Development
  { name: "Social Worker Fatma", gender: "Female", zanId: "1905960490", cadre: "Principal Secretary", department: "Social Policy", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO" },
  { name: "Gender Specialist Zeinab", gender: "Female", zanId: "1907010500", cadre: "Director of Gender", department: "Gender Affairs", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO" },
  { name: "Child Protection Officer", gender: "Male", zanId: "1908060510", cadre: "Child Protection Officer", department: "Child Welfare", salaryScale: "ZPS 4.2", status: "On Probation", institution: "WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO" },
  
  // Other Institutions
  { name: "Auditor General Hassan", gender: "Male", zanId: "1905980520", cadre: "Auditor General", department: "Audit", salaryScale: "ZPS 9.1", status: "Confirmed", institution: "OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI" },
  { name: "Senior Auditor Amina", gender: "Female", zanId: "1907030530", cadre: "Senior Auditor", department: "Financial Audit", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI" },
  { name: "IT Manager Omar Ali", gender: "Male", zanId: "1908080540", cadre: "IT Manager", department: "ICT", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "WAKALA WA SERIKALI MTANDAO (eGAZ)" },
  { name: "Records Manager Fatma", gender: "Female", zanId: "1907050550", cadre: "Records Manager", department: "Archives", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "TAASISI YA NYARAKA NA KUMBUKUMBU" },
];

// Qualifications and certificates data
const QUALIFICATIONS = [
  { type: "PhD", subjects: ["Public Administration", "Economics", "Education", "Health Sciences", "Engineering", "Agriculture"] },
  { type: "Master Degree", subjects: ["MBA", "MA Public Policy", "MSc Engineering", "MA Education", "MSc Agriculture", "MA Development Studies"] },
  { type: "Bachelor Degree", subjects: ["B.A. Public Administration", "B.Ed.", "B.Sc. Engineering", "B.Sc. Agriculture", "LLB", "B.Com", "B.Sc. Computer Science"] },
  { type: "Diploma", subjects: ["Diploma in Administration", "Diploma in Education", "Diploma in Engineering", "Diploma in Agriculture", "Diploma in ICT"] },
  { type: "Certificate", subjects: ["Certificate in Leadership", "Certificate in Project Management", "Certificate in ICT", "Certificate in Languages"] },
];

async function main() {
    console.log('Creating comprehensive employee database...');
    
    // Get all institutions
    const institutions = await db.institution.findMany();
    const institutionMap = new Map(institutions.map(inst => [inst.name, inst.id]));
    
    console.log(`Found ${institutions.length} institutions`);
    
    let employeeCount = 0;
    let certificateCount = 0;
    
    for (const empData of COMPREHENSIVE_EMPLOYEES) {
        const institutionId = institutionMap.get(empData.institution);
        
        if (!institutionId) {
            console.warn(`Institution not found: ${empData.institution}`);
            continue;
        }
        
        // Generate random dates
        const birthYear = 1960 + Math.floor(Math.random() * 30); // Born between 1960-1990
        const employmentYear = 2000 + Math.floor(Math.random() * 24); // Employed between 2000-2024
        const dateOfBirth = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        const employmentDate = new Date(employmentYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        
        // Calculate retirement date (60 years old)
        const retirementDate = new Date(dateOfBirth.getTime());
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);
        
        // Confirmation date (1 year after employment for confirmed employees)
        const confirmationDate = empData.status === 'Confirmed' ? 
            new Date(employmentDate.getTime() + (365 * 24 * 60 * 60 * 1000)) : null;
        
        // Generate phone and other details
        const phoneNumber = '0777-' + Math.floor(Math.random() * 900000 + 100000);
        const zssfNumber = 'ZSSF' + String(employeeCount + 1).padStart(3, '0');
        const payrollNumber = 'PAY' + String(employeeCount + 1).padStart(4, '0');
        
        // Places in Zanzibar
        const places = ['Stone Town', 'Wete', 'Chake Chake', 'Mkoani', 'Vitongoji', 'Mahonda', 'Kizimbani', 'Bububu'];
        const regions = ['Mjini Magharibi', 'Kaskazini Unguja', 'Kusini Unguja', 'Kaskazini Pemba', 'Kusini Pemba'];
        
        try {
            const employee = await db.employee.upsert({
                where: { zanId: empData.zanId },
                update: {},
                create: {
                    id: `emp_${String(employeeCount + 1).padStart(3, '0')}`,
                    employeeEntityId: `emp_entity_${employeeCount + 1}`,
                    name: empData.name,
                    gender: empData.gender,
                    zanId: empData.zanId,
                    zssfNumber: zssfNumber,
                    payrollNumber: payrollNumber,
                    phoneNumber: phoneNumber,
                    contactAddress: `P.O. Box ${Math.floor(Math.random() * 9000) + 1000}, ${places[Math.floor(Math.random() * places.length)]}, Zanzibar`,
                    dateOfBirth: dateOfBirth,
                    placeOfBirth: places[Math.floor(Math.random() * places.length)],
                    region: regions[Math.floor(Math.random() * regions.length)],
                    countryOfBirth: "Tanzania",
                    status: empData.status,
                    cadre: empData.cadre,
                    salaryScale: empData.salaryScale,
                    department: empData.department,
                    ministry: empData.institution,
                    appointmentType: "Permanent",
                    contractType: "Full-time",
                    recentTitleDate: employmentDate,
                    currentReportingOffice: `Director of ${empData.department}`,
                    currentWorkplace: "Head Office",
                    employmentDate: employmentDate,
                    confirmationDate: confirmationDate,
                    retirementDate: retirementDate,
                    ardhilHaliUrl: `https://placehold.co/ardhil-hali-${employeeCount + 1}.pdf`,
                    confirmationLetterUrl: empData.status === 'Confirmed' ? `https://placehold.co/confirmation-${employeeCount + 1}.pdf` : null,
                    jobContractUrl: `https://placehold.co/contract-${employeeCount + 1}.pdf`,
                    birthCertificateUrl: `https://placehold.co/birth-cert-${employeeCount + 1}.pdf`,
                    profileImageUrl: `https://placehold.co/150x150.png?text=${empData.name.split(' ').map(n => n[0]).join('')}`,
                    institutionId: institutionId,
                },
            });
            
            // Generate 2-4 certificates per employee
            const numCertificates = Math.floor(Math.random() * 3) + 2;
            const usedQualifications = new Set();
            
            for (let i = 0; i < numCertificates; i++) {
                const qualType = QUALIFICATIONS[Math.floor(Math.random() * QUALIFICATIONS.length)];
                const subject = qualType.subjects[Math.floor(Math.random() * qualType.subjects.length)];
                const certKey = `${qualType.type}-${subject}`;
                
                if (!usedQualifications.has(certKey)) {
                    usedQualifications.add(certKey);
                    
                    await db.employeeCertificate.create({
                        data: {
                            type: qualType.type,
                            name: subject,
                            url: `https://placehold.co/${qualType.type.toLowerCase().replace(' ', '-')}-${employeeCount + 1}-${i + 1}.pdf`,
                            employeeId: employee.id,
                        }
                    });
                    certificateCount++;
                }
            }
            
            employeeCount++;
            console.log(`✓ Created employee ${employeeCount}: ${empData.name} (${empData.institution})`);
            
        } catch (error) {
            console.error(`✗ Error creating employee ${empData.name}:`, error.message);
        }
    }
    
    // Show final summary
    console.log('\n=== COMPREHENSIVE EMPLOYEE SEEDING SUMMARY ===');
    const totalEmployees = await db.employee.count();
    const totalCertificates = await db.employeeCertificate.count();
    const totalUsers = await db.user.count();
    const totalInstitutions = await db.institution.count();
    
    console.log(`👨‍💼 Total Employees: ${totalEmployees}`);
    console.log(`📜 Total Certificates: ${totalCertificates}`);
    console.log(`👥 Total Users: ${totalUsers}`);
    console.log(`🏢 Total Institutions: ${totalInstitutions}`);
    
    // Show employees by institution
    console.log('\n📊 Employees by Institution:');
    const employeesByInstitution = await db.employee.groupBy({
        by: ['institutionId'],
        _count: {
            _all: true,
        },
        include: {
            institution: {
                select: { name: true }
            }
        }
    });
    
    // Get institution names for the grouped results
    for (const group of employeesByInstitution) {
        const institution = await db.institution.findUnique({
            where: { id: group.institutionId },
            select: { name: true }
        });
        console.log(`   ${institution?.name}: ${group._count._all} employees`);
    }
    
    console.log('\n✅ Comprehensive employee database created successfully!');
    console.log('🎯 Your Employee List now has detailed profiles for all departments and institutions.');
}

main()
    .catch((e) => {
        console.error('❌ Employee seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });