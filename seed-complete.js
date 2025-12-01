const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

// Sample employee data - you'll need to adjust based on your constants file
const SAMPLE_EMPLOYEES = [
  { 
    id: "emp1", 
    employeeEntityId: "emp1_id", 
    name: "Ali Juma Ali", 
    gender: 'Male',
    zanId: "221458232", 
    zssfNumber: "ZSSF001",
    payrollNumber: "PAY001",
    phoneNumber: "0777-123-456",
    contactAddress: "P.O. Box 123, Migombani, Zanzibar",
    dateOfBirth: "1980-05-15",
    placeOfBirth: "Zanzibar City",
    region: "Mjini Magharibi",
    countryOfBirth: "Tanzania",
    status: "On Probation", 
    cadre: "Administrative Officer",
    salaryScale: "ZPS 4.2", 
    department: "Administration",
    ministry: "Public Service and Good Governance",
    institution: 'OFISI YA RAIS, FEDHA NA MIPANGO',
    appointmentType: "Permanent",
    contractType: "Full-time",
    recentTitleDate: "2023-01-10",
    currentReportingOffice: "Director of Administration",
    currentWorkplace: "HQ Office",
    employmentDate: "2023-01-10",
    confirmationDate: null, 
    retirementDate: "2040-05-15",
    ardhilHaliUrl: "https://placehold.co/ardhil-hali.pdf",
    confirmationLetterUrl: null,
    jobContractUrl: "https://placehold.co/job-contract-ali.pdf",
    birthCertificateUrl: "https://placehold.co/birth-cert-ali.pdf",
    profileImageUrl: "https://placehold.co/100x100.png?text=AJA",
    certificates: [
      { type: "Bachelor Degree", name: "B.A. Public Administration", url: "https://placehold.co/bachelor-ali.pdf" },
      { type: "Certificate", name: "Certificate in Office Management", url: "https://placehold.co/cert-ali.pdf" },
    ],
  },
  { 
    id: "emp8", 
    employeeEntityId: "emp8_id", 
    name: "Khadija Nassor", 
    gender: 'Female',
    zanId: "987654321", 
    zssfNumber: "ZSSF008",
    payrollNumber: "PAY008",
    phoneNumber: "0777-888-999",
    contactAddress: "P.O. Box 888, Stone Town, Zanzibar",
    dateOfBirth: "1985-03-20",
    placeOfBirth: "Stone Town",
    region: "Mjini Magharibi",
    countryOfBirth: "Tanzania",
    status: "Confirmed", 
    cadre: "Education Officer",
    salaryScale: "ZPS 5.1", 
    department: "Education",
    ministry: "Education and Vocational Training",
    institution: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI',
    appointmentType: "Permanent",
    contractType: "Full-time",
    recentTitleDate: "2020-01-15",
    currentReportingOffice: "Director of Education",
    currentWorkplace: "Education Office",
    employmentDate: "2020-01-15",
    confirmationDate: "2021-01-15", 
    retirementDate: "2045-03-20",
    ardhilHaliUrl: "https://placehold.co/ardhil-hali-khadija.pdf",
    confirmationLetterUrl: "https://placehold.co/confirmation-khadija.pdf",
    jobContractUrl: "https://placehold.co/job-contract-khadija.pdf",
    birthCertificateUrl: "https://placehold.co/birth-cert-khadija.pdf",
    profileImageUrl: "https://placehold.co/100x100.png?text=KN",
    certificates: [
      { type: "Bachelor Degree", name: "B.Ed. Primary Education", url: "https://placehold.co/bachelor-khadija.pdf" },
    ],
  },
  { 
    id: "emp9", 
    employeeEntityId: "emp9_id", 
    name: "Yussuf Makame", 
    gender: 'Male',
    zanId: "123987654", 
    zssfNumber: "ZSSF009",
    payrollNumber: "PAY009",
    phoneNumber: "0777-999-111",
    contactAddress: "P.O. Box 999, Wete, Pemba",
    dateOfBirth: "1982-07-10",
    placeOfBirth: "Wete",
    region: "Kaskazini Pemba",
    countryOfBirth: "Tanzania",
    status: "Confirmed", 
    cadre: "Technical Officer",
    salaryScale: "ZPS 4.5", 
    department: "Technical Services",
    ministry: "Education and Vocational Training",
    institution: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI',
    appointmentType: "Permanent",
    contractType: "Full-time",
    recentTitleDate: "2019-06-01",
    currentReportingOffice: "Director of Technical Services",
    currentWorkplace: "Technical Office",
    employmentDate: "2019-06-01",
    confirmationDate: "2020-06-01", 
    retirementDate: "2042-07-10",
    ardhilHaliUrl: "https://placehold.co/ardhil-hali-yussuf.pdf",
    confirmationLetterUrl: "https://placehold.co/confirmation-yussuf.pdf",
    jobContractUrl: "https://placehold.co/job-contract-yussuf.pdf",
    birthCertificateUrl: "https://placehold.co/birth-cert-yussuf.pdf",
    profileImageUrl: "https://placehold.co/100x100.png?text=YM",
    certificates: [
      { type: "Diploma", name: "Diploma in Technical Education", url: "https://placehold.co/diploma-yussuf.pdf" },
      { type: "Certificate", name: "Certificate in Computer Skills", url: "https://placehold.co/cert-yussuf.pdf" },
    ],
  },
];

async function main() {
    console.log('Starting comprehensive database seeding...');
    
    // Get all institutions
    const institutions = await db.institution.findMany();
    const institutionMap = new Map(institutions.map(inst => [inst.name, inst.id]));
    console.log(`Found ${institutions.length} institutions`);
    
    // Seed employees
    console.log('\nSeeding employees...');
    for (const emp of SAMPLE_EMPLOYEES) {
        const institutionId = institutionMap.get(emp.institution);
        
        if (!institutionId) {
            console.warn(`Could not find institution: ${emp.institution} for employee ${emp.name}`);
            continue;
        }
        
        try {
            // Convert date strings to Date objects
            const employeeData = {
                id: emp.id,
                employeeEntityId: emp.employeeEntityId,
                name: emp.name,
                gender: emp.gender,
                zanId: emp.zanId,
                zssfNumber: emp.zssfNumber,
                payrollNumber: emp.payrollNumber,
                phoneNumber: emp.phoneNumber,
                contactAddress: emp.contactAddress,
                dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth) : null,
                placeOfBirth: emp.placeOfBirth,
                region: emp.region,
                countryOfBirth: emp.countryOfBirth,
                status: emp.status,
                cadre: emp.cadre,
                salaryScale: emp.salaryScale,
                department: emp.department,
                ministry: emp.ministry,
                appointmentType: emp.appointmentType,
                contractType: emp.contractType,
                recentTitleDate: emp.recentTitleDate ? new Date(emp.recentTitleDate) : null,
                currentReportingOffice: emp.currentReportingOffice,
                currentWorkplace: emp.currentWorkplace,
                employmentDate: emp.employmentDate ? new Date(emp.employmentDate) : null,
                confirmationDate: emp.confirmationDate ? new Date(emp.confirmationDate) : null,
                retirementDate: emp.retirementDate ? new Date(emp.retirementDate) : null,
                ardhilHaliUrl: emp.ardhilHaliUrl,
                confirmationLetterUrl: emp.confirmationLetterUrl,
                jobContractUrl: emp.jobContractUrl,
                birthCertificateUrl: emp.birthCertificateUrl,
                profileImageUrl: emp.profileImageUrl,
                institutionId: institutionId,
            };
            
            const createdEmployee = await db.employee.upsert({
                where: { zanId: emp.zanId },
                update: employeeData,
                create: employeeData,
            });
            
            // Create certificates
            if (emp.certificates && emp.certificates.length > 0) {
                // Delete existing certificates first
                await db.employeeCertificate.deleteMany({
                    where: { employeeId: createdEmployee.id }
                });
                
                // Create new certificates
                for (const cert of emp.certificates) {
                    await db.employeeCertificate.create({
                        data: {
                            type: cert.type,
                            name: cert.name,
                            url: cert.url,
                            employeeId: createdEmployee.id,
                        }
                    });
                }
            }
            
            console.log(`✓ Created/Updated employee: ${emp.name}`);
        } catch (error) {
            console.error(`✗ Error creating employee ${emp.name}:`, error.message);
        }
    }
    
    // Link users to employees
    console.log('\nLinking users to employees...');
    const userEmployeeLinks = [
        { username: 'alijuma', employeeId: 'emp1' },
        { username: 'khadijanassor', employeeId: 'emp8' },
        { username: 'yussufmakame', employeeId: 'emp9' },
    ];
    
    for (const link of userEmployeeLinks) {
        try {
            await db.user.update({
                where: { username: link.username },
                data: { employeeId: link.employeeId },
            });
            console.log(`✓ Linked user ${link.username} to employee ${link.employeeId}`);
        } catch (error) {
            console.error(`✗ Error linking user ${link.username}:`, error.message);
        }
    }
    
    // Show summary
    console.log('\n=== SEEDING SUMMARY ===');
    const totalUsers = await db.user.count();
    const totalEmployees = await db.employee.count();
    const totalInstitutions = await db.institution.count();
    const totalCertificates = await db.employeeCertificate.count();
    
    console.log(`👥 Users: ${totalUsers}`);
    console.log(`👨‍💼 Employees: ${totalEmployees}`);
    console.log(`🏢 Institutions: ${totalInstitutions}`);
    console.log(`📜 Certificates: ${totalCertificates}`);
    
    console.log('\n✅ Database seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });