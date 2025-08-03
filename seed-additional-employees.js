const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

// Additional 40 employees with diverse profiles across different institutions
const ADDITIONAL_EMPLOYEES = [
  // Regional Administration
  { name: "Mhe. Dr. Seif Sharif Hamad", gender: "Male", zanId: "1905550560", cadre: "Regional Commissioner", department: "Regional Administration", salaryScale: "ZPS 8.2", status: "Confirmed", institution: "OFISI YA MKUU WA MKOA WA KUSINI UNGUJA", education: "PhD Public Administration" },
  { name: "Dkt. Mwalimu Fatma Khamis", gender: "Female", zanId: "1906600570", cadre: "District Commissioner", department: "Local Government", salaryScale: "ZPS 7.1", status: "Confirmed", institution: "OFISI YA MKUU WA MKOA WA KUSINI UNGUJA", education: "PhD Political Science" },
  { name: "Mwanakijiji Hassan Omar", gender: "Male", zanId: "1907650580", cadre: "Ward Development Officer", department: "Community Development", salaryScale: "ZPS 4.1", status: "On Probation", institution: "OFISI YA MKUU WA MKOA WA KUSINI UNGUJA", education: "Diploma in Social Work" },
  
  // Treasury
  { name: "CPA Amina Juma Hassan", gender: "Female", zanId: "1905700590", cadre: "Registrar of Treasury", department: "Treasury Operations", salaryScale: "ZPS 7.2", status: "Confirmed", institution: "Ofisi ya Msajili wa Hazina", education: "Masters in Accounting" },
  { name: "Accountant Said Ali Khamis", gender: "Male", zanId: "1906750600", cadre: "Senior Accountant", department: "Financial Management", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "Ofisi ya Msajili wa Hazina", education: "Bachelor in Accounting" },
  { name: "Auditor Mwanajuma Omar", gender: "Female", zanId: "1907800610", cadre: "Internal Auditor", department: "Internal Audit", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "Ofisi ya Msajili wa Hazina", education: "Diploma in Auditing" },
  
  // Measurement Agency
  { name: "Metrologist Dr. Hassan Ali", gender: "Male", zanId: "1905720620", cadre: "Chief Metrologist", department: "Standards", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "Wakala wa Vipimo Zanzibar", education: "PhD Engineering" },
  { name: "Engineer Fatma Said Omar", gender: "Female", zanId: "1906770630", cadre: "Calibration Engineer", department: "Calibration Services", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "Wakala wa Vipimo Zanzibar", education: "Masters in Engineering" },
  { name: "Technician Ahmed Hassan", gender: "Male", zanId: "1907820640", cadre: "Laboratory Technician", department: "Testing Laboratory", salaryScale: "ZPS 3.2", status: "On Probation", institution: "Wakala wa Vipimo Zanzibar", education: "Certificate in Laboratory Technology" },
  
  // Public Service Commission
  { name: "Judge (Rtd) Ali Mohamed", gender: "Male", zanId: "1905740650", cadre: "Chairman", department: "Commission", salaryScale: "ZPS 9.2", status: "Confirmed", institution: "KAMISHENI YA UTUMISHI WA UMMA", education: "LLM Constitutional Law" },
  { name: "Dr. Lawyer Zeinab Hassan", gender: "Female", zanId: "1906790660", cadre: "Commissioner", department: "Legal Affairs", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "KAMISHENI YA UTUMISHI WA UMMA", education: "PhD Law" },
  { name: "HR Specialist Juma Ali", gender: "Male", zanId: "1907840670", cadre: "HR Development Officer", department: "Human Resources", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "KAMISHENI YA UTUMISHI WA UMMA", education: "Masters in HR Management" },
  
  // eGAZ Digital Services
  { name: "IT Director Dr. Omar Hassan", gender: "Male", zanId: "1905760680", cadre: "Chief Technology Officer", department: "ICT Strategy", salaryScale: "ZPS 7.1", status: "Confirmed", institution: "WAKALA WA SERIKALI MTANDAO (eGAZ)", education: "PhD Computer Science" },
  { name: "Cyber Security Expert Amina", gender: "Female", zanId: "1906810690", cadre: "Security Analyst", department: "Cyber Security", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WAKALA WA SERIKALI MTANDAO (eGAZ)", education: "Masters in Cyber Security" },
  { name: "Web Developer Said Omar", gender: "Male", zanId: "1907860700", cadre: "Software Developer", department: "Development", salaryScale: "ZPS 4.2", status: "On Probation", institution: "WAKALA WA SERIKALI MTANDAO (eGAZ)", education: "Bachelor in Computer Science" },
  { name: "Database Admin Fatma Ali", gender: "Female", zanId: "1908910710", cadre: "Database Administrator", department: "Data Management", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "WAKALA WA SERIKALI MTANDAO (eGAZ)", education: "Diploma in ICT" },
  
  // Land Commission
  { name: "Surveyor General Hassan", gender: "Male", zanId: "1905780720", cadre: "Chairman", department: "Land Administration", salaryScale: "ZPS 8.2", status: "Confirmed", institution: "Kamisheni ya Ardhi Zanzibar", education: "Masters in Land Surveying" },
  { name: "Land Lawyer Dr. Mwanajuma", gender: "Female", zanId: "1906830730", cadre: "Legal Advisor", department: "Land Law", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "Kamisheni ya Ardhi Zanzibar", education: "LLM Land Law" },
  { name: "Cartographer Ahmed Said", gender: "Male", zanId: "1907880740", cadre: "Senior Cartographer", department: "Mapping", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "Kamisheni ya Ardhi Zanzibar", education: "Bachelor in Geography" },
  
  // Accountant General
  { name: "CPA Dr. Ali Hassan Omar", gender: "Male", zanId: "1905800750", cadre: "Accountant General", department: "Government Accounting", salaryScale: "ZPS 8.2", status: "Confirmed", institution: "Ofisi ya Mhasibu Mkuu wa Serikali", education: "PhD Accounting" },
  { name: "Budget Analyst Fatma Juma", gender: "Female", zanId: "1906850760", cadre: "Principal Budget Officer", department: "Budget Analysis", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "Ofisi ya Mhasibu Mkuu wa Serikali", education: "Masters in Economics" },
  { name: "Financial Controller Said", gender: "Male", zanId: "1907900770", cadre: "Financial Controller", department: "Financial Control", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "Ofisi ya Mhasibu Mkuu wa Serikali", education: "Bachelor in Finance" },
  
  // Archives Institute
  { name: "Chief Archivist Dr. Mwanajuma", gender: "Female", zanId: "1906870780", cadre: "Chief Archivist", department: "Archives Management", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "TAASISI YA NYARAKA NA KUMBUKUMBU", education: "PhD Library Science" },
  { name: "Digital Archivist Hassan Ali", gender: "Male", zanId: "1907920790", cadre: "Digital Preservation Officer", department: "Digital Archives", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "TAASISI YA NYARAKA NA KUMBUKUMBU", education: "Masters in Information Science" },
  { name: "Librarian Amina Omar", gender: "Female", zanId: "1908970800", cadre: "Research Librarian", department: "Research Services", salaryScale: "ZPS 4.1", status: "On Probation", institution: "TAASISI YA NYARAKA NA KUMBUKUMBU", education: "Bachelor in Library Science" },
  
  // President's Office - Work, Economy & Investment
  { name: "Economist Dr. Omar Juma", gender: "Male", zanId: "1905890810", cadre: "Chief Economist", department: "Economic Policy", salaryScale: "ZPS 7.2", status: "Confirmed", institution: "AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI", education: "PhD Economics" },
  { name: "Investment Analyst Zeinab", gender: "Female", zanId: "1906940820", cadre: "Senior Investment Officer", department: "Investment Promotion", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI", education: "Masters in Finance" },
  { name: "Statistics Officer Ahmed", gender: "Male", zanId: "1907990830", cadre: "Principal Statistician", department: "Economic Statistics", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI", education: "Bachelor in Statistics" },
  
  // Tourism Commission
  { name: "Tourism Expert Dr. Hassan", gender: "Male", zanId: "1905910840", cadre: "Director General", department: "Tourism Development", salaryScale: "ZPS 7.2", status: "Confirmed", institution: "KAMISHENI YA UTALII ZANZIBAR", education: "PhD Tourism Management" },
  { name: "Marketing Manager Fatma", gender: "Female", zanId: "1906960850", cadre: "Marketing Director", department: "Tourism Marketing", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "KAMISHENI YA UTALII ZANZIBAR", education: "MBA Marketing" },
  { name: "Tour Guide Coordinator Said", gender: "Male", zanId: "1908010860", cadre: "Senior Tourism Officer", department: "Tourism Services", salaryScale: "ZPS 4.2", status: "On Probation", institution: "KAMISHENI YA UTALII ZANZIBAR", education: "Diploma in Tourism" },
  
  // Employment Secretariat
  { name: "Labour Economist Dr. Ali", gender: "Male", zanId: "1905930870", cadre: "Director of Employment", department: "Employment Policy", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "SEKRETARIETI YA AJIRA", education: "PhD Labour Economics" },
  { name: "Career Counselor Amina", gender: "Female", zanId: "1906980880", cadre: "Principal Career Officer", department: "Career Development", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "SEKRETARIETI YA AJIRA", education: "Masters in Psychology" },
  { name: "Skills Development Officer", gender: "Male", zanId: "1908030890", cadre: "Training Coordinator", department: "Skills Training", salaryScale: "ZPS 4.1", status: "Confirmed", institution: "SEKRETARIETI YA AJIRA", education: "Bachelor in Education" },
  
  // Education Institute Zanzibar
  { name: "Education Researcher Prof. Omar", gender: "Male", zanId: "1905950900", cadre: "Director of Research", department: "Educational Research", salaryScale: "ZPS 7.1", status: "Confirmed", institution: "TAASISI YA ELIMU YA ZANZIBAR", education: "PhD Education" },
  { name: "Curriculum Developer Dr. Fatma", gender: "Female", zanId: "1907000910", cadre: "Curriculum Specialist", department: "Curriculum Development", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "TAASISI YA ELIMU YA ZANZIBAR", education: "PhD Curriculum Studies" },
  { name: "Teacher Trainer Hassan", gender: "Male", zanId: "1908050920", cadre: "Teacher Development Officer", department: "Teacher Training", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "TAASISI YA ELIMU YA ZANZIBAR", education: "Masters in Education" },
  
  // Disaster Management Commission
  { name: "Emergency Manager Dr. Said", gender: "Male", zanId: "1905970930", cadre: "Director General", department: "Disaster Management", salaryScale: "ZPS 7.2", status: "Confirmed", institution: "KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR", education: "PhD Disaster Management" },
  { name: "Risk Assessment Expert Zeinab", gender: "Female", zanId: "1907020940", cadre: "Risk Analysis Officer", department: "Risk Assessment", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR", education: "Masters in Risk Management" },
  { name: "Emergency Response Coordinator", gender: "Male", zanId: "1908070950", cadre: "Response Coordinator", department: "Emergency Response", salaryScale: "ZPS 4.2", status: "On Probation", institution: "KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR", education: "Bachelor in Public Administration" },
  
  // Construction Agency
  { name: "Construction Manager Eng. Ali", gender: "Male", zanId: "1905990960", cadre: "Chief Executive Officer", department: "Construction Management", salaryScale: "ZPS 7.2", status: "Confirmed", institution: "WAKALA WA MAJENGO ZANZIBAR", education: "Masters in Construction Management" },
  { name: "Quantity Surveyor Amina", gender: "Female", zanId: "1907040970", cadre: "Principal Quantity Surveyor", department: "Cost Estimation", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WAKALA WA MAJENGO ZANZIBAR", education: "Bachelor in Quantity Surveying" },
  { name: "Site Supervisor Hassan", gender: "Male", zanId: "1908090980", cadre: "Construction Supervisor", department: "Site Management", salaryScale: "ZPS 4.1", status: "Confirmed", institution: "WAKALA WA MAJENGO ZANZIBAR", education: "Diploma in Construction" }
];

// Additional qualifications for diverse backgrounds
const DIVERSE_QUALIFICATIONS = [
  { type: "PhD", subjects: ["Public Administration", "Economics", "Law", "Engineering", "Computer Science", "Education", "Political Science", "Disaster Management", "Tourism Management", "Labour Economics"] },
  { type: "LLM", subjects: ["Constitutional Law", "Land Law", "International Law", "Commercial Law", "Human Rights Law"] },
  { type: "Masters", subjects: ["MBA", "Masters in Accounting", "Masters in HR Management", "Masters in Engineering", "Masters in Cyber Security", "Masters in Information Science", "Masters in Finance", "Masters in Psychology", "Masters in Risk Management", "Masters in Construction Management"] },
  { type: "Bachelor Degree", subjects: ["Bachelor in Accounting", "Bachelor in Computer Science", "Bachelor in Geography", "Bachelor in Finance", "Bachelor in Library Science", "Bachelor in Statistics", "Bachelor in Education", "Bachelor in Public Administration", "Bachelor in Quantity Surveying"] },
  { type: "Diploma", subjects: ["Diploma in Social Work", "Diploma in Auditing", "Diploma in ICT", "Diploma in Tourism", "Diploma in Construction", "Diploma in Laboratory Technology"] },
  { type: "Certificate", subjects: ["Certificate in Project Management", "Certificate in Digital Marketing", "Certificate in Emergency Response", "Certificate in Quality Control", "Certificate in Data Analysis"] },
];

async function main() {
    console.log('Creating additional 40 employees with diverse profiles...');
    
    // Get all institutions
    const institutions = await db.institution.findMany();
    const institutionMap = new Map(institutions.map(inst => [inst.name, inst.id]));
    
    // Get current employee count
    const currentEmployeeCount = await db.employee.count();
    console.log(`Current employee count: ${currentEmployeeCount}`);
    
    let newEmployeeCount = 0;
    let newCertificateCount = 0;
    
    for (const empData of ADDITIONAL_EMPLOYEES) {
        const institutionId = institutionMap.get(empData.institution);
        
        if (!institutionId) {
            console.warn(`Institution not found: ${empData.institution}`);
            continue;
        }
        
        // Generate realistic dates based on career level
        const isSeventies = empData.cadre.includes('Director') || empData.cadre.includes('Principal Secretary') || empData.cadre.includes('Chairman');
        const isSixties = empData.cadre.includes('Chief') || empData.cadre.includes('Senior') || empData.cadre.includes('Commissioner');
        
        const birthYear = isSeventies ? (1950 + Math.floor(Math.random() * 15)) : 
                         isSixties ? (1955 + Math.floor(Math.random() * 20)) :
                         (1965 + Math.floor(Math.random() * 25));
                         
        const employmentYear = birthYear + 25 + Math.floor(Math.random() * 15); // Start career at 25-40
        
        const dateOfBirth = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        const employmentDate = new Date(employmentYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        
        // Calculate retirement date (60 years old)
        const retirementDate = new Date(dateOfBirth.getTime());
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);
        
        // Confirmation date (1-2 years after employment for confirmed employees)
        const confirmationDate = empData.status === 'Confirmed' ? 
            new Date(employmentDate.getTime() + ((1 + Math.random()) * 365 * 24 * 60 * 60 * 1000)) : null;
        
        // Generate contact details
        const phoneNumber = '0777-' + Math.floor(Math.random() * 900000 + 100000);
        const zssfNumber = 'ZSSF' + String(currentEmployeeCount + newEmployeeCount + 1).padStart(3, '0');
        const payrollNumber = 'PAY' + String(currentEmployeeCount + newEmployeeCount + 1).padStart(4, '0');
        
        // Zanzibar locations
        const places = ['Stone Town', 'Wete', 'Chake Chake', 'Mkoani', 'Vitongoji', 'Mahonda', 'Kizimbani', 'Bububu', 'Mkokotoni', 'Nungwi'];
        const regions = ['Mjini Magharibi', 'Kaskazini Unguja', 'Kusini Unguja', 'Kaskazini Pemba', 'Kusini Pemba'];
        
        try {
            const employee = await db.employee.upsert({
                where: { zanId: empData.zanId },
                update: {},
                create: {
                    id: `emp_${String(currentEmployeeCount + newEmployeeCount + 1).padStart(3, '0')}`,
                    employeeEntityId: `emp_entity_${currentEmployeeCount + newEmployeeCount + 1}`,
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
                    ardhilHaliUrl: `https://placehold.co/ardhil-hali-${currentEmployeeCount + newEmployeeCount + 1}.pdf`,
                    confirmationLetterUrl: empData.status === 'Confirmed' ? `https://placehold.co/confirmation-${currentEmployeeCount + newEmployeeCount + 1}.pdf` : null,
                    jobContractUrl: `https://placehold.co/contract-${currentEmployeeCount + newEmployeeCount + 1}.pdf`,
                    birthCertificateUrl: `https://placehold.co/birth-cert-${currentEmployeeCount + newEmployeeCount + 1}.pdf`,
                    profileImageUrl: `https://placehold.co/150x150.png?text=${empData.name.split(' ').slice(0,2).map(n => n[0]).join('')}`,
                    institutionId: institutionId,
                },
            });
            
            // Create primary education certificate based on empData.education
            await db.employeeCertificate.create({
                data: {
                    type: empData.education.includes('PhD') ? 'PhD' :
                          empData.education.includes('LLM') ? 'LLM' :
                          empData.education.includes('Masters') || empData.education.includes('MBA') ? 'Masters' :
                          empData.education.includes('Bachelor') ? 'Bachelor Degree' :
                          empData.education.includes('Diploma') ? 'Diploma' : 'Certificate',
                    name: empData.education,
                    url: `https://placehold.co/${empData.education.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${currentEmployeeCount + newEmployeeCount + 1}.pdf`,
                    employeeId: employee.id,
                }
            });
            newCertificateCount++;
            
            // Add 1-3 additional certificates based on career level
            const additionalCerts = isSeventies ? 3 : isSixties ? 2 : 1;
            const usedQualifications = new Set([empData.education]);
            
            for (let i = 0; i < additionalCerts; i++) {
                const qualType = DIVERSE_QUALIFICATIONS[Math.floor(Math.random() * DIVERSE_QUALIFICATIONS.length)];
                const subject = qualType.subjects[Math.floor(Math.random() * qualType.subjects.length)];
                
                if (!usedQualifications.has(subject)) {
                    usedQualifications.add(subject);
                    
                    await db.employeeCertificate.create({
                        data: {
                            type: qualType.type,
                            name: subject,
                            url: `https://placehold.co/${qualType.type.toLowerCase().replace(' ', '-')}-${currentEmployeeCount + newEmployeeCount + 1}-${i + 2}.pdf`,
                            employeeId: employee.id,
                        }
                    });
                    newCertificateCount++;
                }
            }
            
            newEmployeeCount++;
            console.log(`✓ Created employee ${currentEmployeeCount + newEmployeeCount}: ${empData.name} (${empData.institution})`);
            
        } catch (error) {
            console.error(`✗ Error creating employee ${empData.name}:`, error.message);
        }
    }
    
    // Show final summary
    console.log('\n=== ADDITIONAL EMPLOYEE SEEDING SUMMARY ===');
    const totalEmployees = await db.employee.count();
    const totalCertificates = await db.employeeCertificate.count();
    
    console.log(`👨‍💼 New Employees Added: ${newEmployeeCount}`);
    console.log(`📜 New Certificates Added: ${newCertificateCount}`);
    console.log(`👨‍💼 Total Employees Now: ${totalEmployees}`);
    console.log(`📜 Total Certificates Now: ${totalCertificates}`);
    
    console.log('\n✅ Additional 40 employees with diverse profiles created successfully!');
    console.log('🎯 Many previously empty institutions now have skilled staff members.');
    console.log('📚 Educational backgrounds range from Certificates to PhD levels.');
    console.log('🏢 Career levels span from entry-level to senior executive positions.');
}

main()
    .catch((e) => {
        console.error('❌ Additional employee seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });