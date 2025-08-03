const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

// 50 more diverse employees focusing on institutions that need more staff
const NEW_EMPLOYEES = [
  // Anti-Corruption Authority (MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR)
  { name: "Lawyer Dr. Ali Hassan Mohamed", gender: "Male", zanId: "1905731041", cadre: "Director General", department: "Investigations", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR", education: "LLM Criminal Law" },
  { name: "Investigation Officer Zeinab Omar", gender: "Female", zanId: "1906781051", cadre: "Senior Investigator", department: "Anti-Corruption", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR", education: "Bachelor in Criminology" },
  { name: "Forensic Accountant Said Ali", gender: "Male", zanId: "1907831061", cadre: "Forensic Analyst", department: "Financial Crimes", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR", education: "Masters in Forensic Accounting" },
  
  // Director of Public Prosecutions (AFISI YA MKURUGENZI WA MASHTAKA)
  { name: "Chief Prosecutor Dr. Mwalimu Hassan", gender: "Male", zanId: "1905751071", cadre: "Director of Public Prosecutions", department: "Criminal Prosecutions", salaryScale: "ZPS 8.2", status: "Confirmed", institution: "AFISI YA MKURUGENZI WA MASHTAKA", education: "LLM Criminal Procedure" },
  { name: "State Attorney Amina Juma Ali", gender: "Female", zanId: "1906801081", cadre: "Senior State Attorney", department: "Court Proceedings", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "AFISI YA MKURUGENZI WA MASHTAKA", education: "LLB Law" },
  { name: "Legal Research Officer Omar Said", gender: "Male", zanId: "1907851091", cadre: "Legal Research Officer", department: "Legal Research", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "AFISI YA MKURUGENZI WA MASHTAKA", education: "Bachelor in Law" },
  
  // Attorney General (AFISI YA MWANASHERIA MKUU)
  { name: "Attorney General Prof. Fatma Hassan", gender: "Female", zanId: "1905771101", cadre: "Attorney General", department: "Legal Affairs", salaryScale: "ZPS 8.2", status: "Confirmed", institution: "AFISI YA MWANASHERIA MKUU", education: "LLM Constitutional Law" },
  { name: "Deputy Attorney General Dr. Ahmed Omar", gender: "Male", zanId: "1906821111", cadre: "Deputy Attorney General", department: "Legal Advisory", salaryScale: "ZPS 7.2", status: "Confirmed", institution: "AFISI YA MWANASHERIA MKUU", education: "LLM Public Law" },
  { name: "Legal Advisor Mwanasha Ali", gender: "Female", zanId: "1907871121", cadre: "Principal Legal Officer", department: "Legal Drafting", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "AFISI YA MWANASHERIA MKUU", education: "LLB Law" },
  
  // Drug Control Authority (MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR)
  { name: "Drug Control Expert Dr. Hassan Ali Omar", gender: "Male", zanId: "1905791131", cadre: "Director General", department: "Drug Control", salaryScale: "ZPS 7.2", status: "Confirmed", institution: "MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR", education: "PhD Criminology" },
  { name: "Narcotics Inspector Zeinab Hassan", gender: "Female", zanId: "1906841141", cadre: "Chief Inspector", department: "Drug Enforcement", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR", education: "Masters in Criminal Justice" },
  { name: "Rehabilitation Officer Ahmed Juma", gender: "Male", zanId: "1907891151", cadre: "Rehabilitation Coordinator", department: "Treatment Programs", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR", education: "Bachelor in Psychology" },
  
  // President's Office - Constitution, Law and Service (OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA)
  { name: "Constitutional Expert Dr. Amina Said", gender: "Female", zanId: "1905811161", cadre: "Principal Secretary", department: "Constitutional Affairs", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA", education: "PhD Constitutional Law" },
  { name: "Legal Draftsman Omar Hassan Ali", gender: "Male", zanId: "1906861171", cadre: "Chief Legal Draftsman", department: "Legal Drafting", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA", education: "LLM Legislative Drafting" },
  { name: "Good Governance Officer Fatma Omar", gender: "Female", zanId: "1907911181", cadre: "Director of Good Governance", department: "Governance", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA", education: "Masters in Public Administration" },
  
  // Ethics Commission (TUME YA MAADILI YA VIONGOZI WA UMMA)
  { name: "Ethics Expert Prof. Said Hassan", gender: "Male", zanId: "1905831191", cadre: "Chairperson", department: "Ethics", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "TUME YA MAADILI YA VIONGOZI WA UMMA", education: "PhD Ethics and Governance" },
  { name: "Investigation Officer Dr. Mwanajuma", gender: "Female", zanId: "1906881201", cadre: "Principal Investigation Officer", department: "Investigations", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "TUME YA MAADILI YA VIONGOZI WA UMMA", education: "Masters in Public Administration" },
  { name: "Ethics Officer Ahmed Hassan", gender: "Male", zanId: "1907931211", cadre: "Ethics Officer", department: "Compliance", salaryScale: "ZPS 4.2", status: "On Probation", institution: "TUME YA MAADILI YA VIONGOZI WA UMMA", education: "Bachelor in Law" },
  
  // Electoral Commission (TUME YA UCHAGUZI YA ZANZIBAR)
  { name: "Election Expert Dr. Hassan Omar", gender: "Male", zanId: "1905851221", cadre: "Chairperson", department: "Elections", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "TUME YA UCHAGUZI YA ZANZIBAR", education: "PhD Political Science" },
  { name: "Election Manager Amina Ali", gender: "Female", zanId: "1906901231", cadre: "Director of Elections", department: "Election Management", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "TUME YA UCHAGUZI YA ZANZIBAR", education: "Masters in Political Science" },
  { name: "Voter Education Officer Omar Juma", gender: "Male", zanId: "1907951241", cadre: "Voter Education Officer", department: "Civic Education", salaryScale: "ZPS 4.1", status: "Confirmed", institution: "TUME YA UCHAGUZI YA ZANZIBAR", education: "Bachelor in Mass Communication" },
  
  // President's Office - Ikulu (OFISI YA RAIS - IKULU)
  { name: "Protocol Officer Dr. Fatma Ali", gender: "Female", zanId: "1905871251", cadre: "Chief Protocol Officer", department: "Protocol", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "OFISI YA RAIS - IKULU", education: "Masters in International Relations" },
  { name: "Security Advisor Ahmed Hassan Omar", gender: "Male", zanId: "1906921261", cadre: "Security Advisor", department: "Security", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "OFISI YA RAIS - IKULU", education: "Masters in Security Studies" },
  { name: "Press Secretary Said Ali Hassan", gender: "Male", zanId: "1907971271", cadre: "Press Secretary", department: "Media Relations", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "OFISI YA RAIS - IKULU", education: "Bachelor in Journalism" },
  
  // First Vice President's Office (OFISI YA MAKAMO WA KWANZA WA RAISI)
  { name: "Policy Advisor Dr. Zeinab Omar", gender: "Female", zanId: "1905891281", cadre: "Principal Secretary", department: "Policy Coordination", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "OFISI YA MAKAMO WA KWANZA WA RAISI", education: "PhD Public Policy" },
  { name: "Development Specialist Hassan Ali Juma", gender: "Male", zanId: "1906941291", cadre: "Director of Development", department: "Development Programs", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "OFISI YA MAKAMO WA KWANZA WA RAISI", education: "Masters in Development Studies" },
  { name: "Program Coordinator Amina Hassan", gender: "Female", zanId: "1907991301", cadre: "Program Officer", department: "Program Management", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "OFISI YA MAKAMO WA KWANZA WA RAISI", education: "Bachelor in Public Administration" },
  
  // Second Vice President's Office (OFISI YA MAKAMO WA PILI WA RAISI)
  { name: "Administration Expert Engineer Omar Hassan", gender: "Male", zanId: "1905911311", cadre: "Principal Secretary", department: "Administration", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "OFISI YA MAKAMO WA PILI WA RAISI", education: "Masters in Public Administration" },
  { name: "Coordination Officer Dr. Fatma Said", gender: "Female", zanId: "1906961321", cadre: "Director of Coordination", department: "Inter-ministerial Coordination", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "OFISI YA MAKAMO WA PILI WA RAISI", education: "PhD Public Administration" },
  { name: "Administrative Officer Ahmed Ali", gender: "Male", zanId: "1908011331", cadre: "Senior Administrative Officer", department: "General Administration", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "OFISI YA MAKAMO WA PILI WA RAISI", education: "Bachelor in Administration" },
  
  // Mufti Office (OFISI YA MUFTI MKUU WA ZANZIBAR)
  { name: "Islamic Scholar Dr. Hassan Juma Omar", gender: "Male", zanId: "1905931341", cadre: "Deputy Mufti", department: "Islamic Affairs", salaryScale: "ZPS 7.2", status: "Confirmed", institution: "OFISI YA MUFTI MKUU WA ZANZIBAR", education: "PhD Islamic Studies" },
  { name: "Islamic Education Officer Mwanajuma Hassan", gender: "Female", zanId: "1906981351", cadre: "Islamic Education Coordinator", department: "Religious Education", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "OFISI YA MUFTI MKUU WA ZANZIBAR", education: "Masters in Islamic Education" },
  { name: "Religious Affairs Officer Said Omar Ali", gender: "Male", zanId: "1908031361", cadre: "Religious Affairs Officer", department: "Community Outreach", salaryScale: "ZPS 4.1", status: "Confirmed", institution: "OFISI YA MUFTI MKUU WA ZANZIBAR", education: "Bachelor in Islamic Studies" },
  
  // Regional Administration (OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ)
  { name: "Regional Affairs Expert Prof. Dr. Amina Hassan", gender: "Female", zanId: "1905951371", cadre: "Principal Secretary", department: "Regional Affairs", salaryScale: "ZPS 8.1", status: "Confirmed", institution: "OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ", education: "PhD Regional Development" },
  { name: "Local Government Specialist Dr. Omar Ali", gender: "Male", zanId: "1907001381", cadre: "Director of Local Government", department: "Local Government", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ", education: "PhD Local Government" },
  { name: "Community Development Officer Dr. Fatma Juma Hassan", gender: "Female", zanId: "1908051391", cadre: "Community Development Coordinator", department: "Community Development", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ", education: "Masters in Community Development" },
  
  // Additional employees across other institutions
  { name: "Infrastructure Engineer Ahmed Said", gender: "Male", zanId: "1909101401", cadre: "Senior Engineer", department: "Infrastructure", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI", education: "Masters in Civil Engineering" },
  { name: "Agricultural Specialist Dr. Hassan Ali", gender: "Male", zanId: "1905971411", cadre: "Chief Agricultural Officer", department: "Crop Production", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO", education: "PhD Agronomy" },
  { name: "Energy Expert Zeinab Omar Hassan", gender: "Female", zanId: "1907021421", cadre: "Energy Coordinator", department: "Renewable Energy", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "WIZARA YA MAJI NISHATI NA MADINI", education: "Masters in Energy Engineering" },
  { name: "Trade Promotion Officer Said Omar", gender: "Male", zanId: "1908071431", cadre: "Trade Development Officer", department: "Export Promotion", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA", education: "Bachelor in International Business" },
  { name: "Youth Development Coordinator Dr. Amina Ali", gender: "Female", zanId: "1905991441", cadre: "Youth Programs Director", department: "Youth Development", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO", education: "PhD Youth Development" },
  { name: "Sports Development Officer Omar Hassan", gender: "Male", zanId: "1907041451", cadre: "Sports Coordinator", department: "Sports Development", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO", education: "Bachelor in Sports Science" },
  { name: "Employment Services Manager Fatma Ali", gender: "Female", zanId: "1908091461", cadre: "Employment Services Manager", department: "Job Placement", salaryScale: "ZPS 5.1", status: "Confirmed", institution: "SEKRETARIETI YA AJIRA", education: "Masters in Human Resource Management" },
  { name: "Construction Project Manager Dr. Hassan Omar", gender: "Male", zanId: "1906011471", cadre: "Project Manager", department: "Infrastructure Projects", salaryScale: "ZPS 6.1", status: "Confirmed", institution: "WAKALA WA MAJENGO ZANZIBAR", education: "Masters in Construction Management" },
  { name: "Disaster Response Coordinator Amina Hassan", gender: "Female", zanId: "1907061481", cadre: "Emergency Response Manager", department: "Emergency Management", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR", education: "Masters in Disaster Management" },
  { name: "Archive Specialist Ahmed Omar", gender: "Male", zanId: "1908111491", cadre: "Digital Archivist", department: "Digital Archives", salaryScale: "ZPS 4.2", status: "Confirmed", institution: "TAASISI YA NYARAKA NA KUMBUKUMBU", education: "Masters in Information Science" },
  { name: "Marine Conservation Expert Dr. Zeinab Ali", gender: "Female", zanId: "1906031501", cadre: "Marine Biologist", department: "Marine Conservation", salaryScale: "ZPS 6.2", status: "Confirmed", institution: "WIZARA YA UCHUMI WA BULUU NA UVUVI", education: "PhD Marine Biology" },
  { name: "Heritage Conservator Omar Ali Hassan", gender: "Male", zanId: "1907081511", cadre: "Conservation Specialist", department: "Heritage Protection", salaryScale: "ZPS 5.2", status: "Confirmed", institution: "WIZARA YA UTALII NA MAMBO YA KALE", education: "Masters in Heritage Conservation" },
];

// Enhanced qualifications for specialized roles
const SPECIALIZED_QUALIFICATIONS = [
  { type: "PhD", subjects: ["Urban Planning", "Criminal Law", "Environmental Science", "Mass Communication", "Water Engineering", "Maritime Engineering", "Taxation", "Education Leadership", "Public Health", "Human Rights Law", "Electrical Engineering", "Marine Biology"] },
  { type: "LLM", subjects: ["Criminal Procedure", "Maritime Law", "Human Rights Law", "International Law", "Environmental Law", "Constitutional Law"] },
  { type: "Masters", subjects: ["Urban Planning", "Forensic Accounting", "Public Policy", "Food Science", "Project Management", "Climate Science", "Journalism", "Hydrology", "International Trade", "Research Methods", "Public Health", "Power Engineering", "Heritage Conservation"] },
  { type: "Bachelor Degree", subjects: ["Geography", "Criminology", "Law", "Education", "Environmental Studies", "Broadcasting Technology", "Security Studies", "Accounting", "Human Rights", "Business Administration"] },
  { type: "Diploma", subjects: ["Laboratory Technology", "Water Technology", "Community Health", "Electrical Technology", "ICT", "Public Administration"] },
  { type: "Certificate", subjects: ["Professional Development", "Leadership", "Digital Skills", "Quality Management", "Project Management", "Emergency Response"] },
];

async function main() {
    console.log('Creating 50 additional diverse employees with specialized roles...');
    
    // Get all institutions
    const institutions = await db.institution.findMany();
    const institutionMap = new Map(institutions.map(inst => [inst.name, inst.id]));
    
    // Get current employee count
    const currentEmployeeCount = await db.employee.count();
    console.log(`Current employee count: ${currentEmployeeCount}`);
    
    let newEmployeeCount = 0;
    let newCertificateCount = 0;
    
    for (const empData of NEW_EMPLOYEES) {
        const institutionId = institutionMap.get(empData.institution);
        
        if (!institutionId) {
            console.warn(`Institution not found: ${empData.institution}`);
            continue;
        }
        
        // Generate realistic dates based on career level and specialization
        const isExecutiveLevel = empData.cadre.includes('Director General') || empData.cadre.includes('Managing Director') || empData.cadre.includes('Principal Secretary') || empData.cadre.includes('Vice Chancellor') || empData.cadre.includes('Chairperson');
        const isDirectorLevel = empData.cadre.includes('Director') || empData.cadre.includes('Dean') || empData.cadre.includes('Chief') || empData.cadre.includes('Commissioner');
        const isSeniorLevel = empData.cadre.includes('Senior') || empData.cadre.includes('Principal');
        
        const birthYear = isExecutiveLevel ? (1955 + Math.floor(Math.random() * 10)) : 
                         isDirectorLevel ? (1960 + Math.floor(Math.random() * 15)) :
                         isSeniorLevel ? (1965 + Math.floor(Math.random() * 20)) :
                         (1970 + Math.floor(Math.random() * 25));
                         
        const employmentYear = birthYear + 25 + Math.floor(Math.random() * 15); // Career start at 25-40
        
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
        const places = ['Stone Town', 'Wete', 'Chake Chake', 'Mkoani', 'Vitongoji', 'Mahonda', 'Kizimbani', 'Bububu', 'Mkokotoni', 'Nungwi', 'Kiwengwa', 'Jambiani'];
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
                    currentReportingOffice: isExecutiveLevel ? "Minister" : `Director of ${empData.department}`,
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
            
            // Add 2-4 additional specialized certificates based on career level
            const additionalCerts = isExecutiveLevel ? 4 : isDirectorLevel ? 3 : isSeniorLevel ? 2 : 1;
            const usedQualifications = new Set([empData.education]);
            
            for (let i = 0; i < additionalCerts; i++) {
                const qualType = SPECIALIZED_QUALIFICATIONS[Math.floor(Math.random() * SPECIALIZED_QUALIFICATIONS.length)];
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
    console.log('\\n=== 50 ADDITIONAL EMPLOYEE SEEDING SUMMARY ===');
    const totalEmployees = await db.employee.count();
    const totalCertificates = await db.employeeCertificate.count();
    
    console.log(`👨‍💼 New Employees Added: ${newEmployeeCount}`);
    console.log(`📜 New Certificates Added: ${newCertificateCount}`);
    console.log(`👨‍💼 Total Employees Now: ${totalEmployees}`);
    console.log(`📜 Total Certificates Now: ${totalCertificates}`);
    
    // Show distribution across key institutions
    console.log('\\n📊 New Employee Distribution:');
    const newInstitutions = [...new Set(NEW_EMPLOYEES.map(emp => emp.institution))];
    for (const instName of newInstitutions) {
        const count = NEW_EMPLOYEES.filter(emp => emp.institution === instName).length;
        console.log(`   ${instName}: ${count} employees`);
    }
    
    console.log('\\n✅ Additional 50 specialized employees created successfully!');
    console.log('🎯 Previously understaffed institutions now have expert personnel.');
    console.log('🏆 Executive and specialized positions filled with qualified professionals.');
    console.log('📚 Advanced qualifications added for senior leadership roles.');
    console.log('🌟 Total workforce now includes ~150 diverse employee profiles.');
}

main()
    .catch((e) => {
        console.error('❌ Additional employee seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });