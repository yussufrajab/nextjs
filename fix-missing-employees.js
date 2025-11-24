const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

const MISSING_EMPLOYEES = [
  { name: "Mhe. Dr. Seif Sharif Hamad", gender: "Male", zanId: "1905550560", cadre: "Regional Commissioner", department: "Regional Administration", salaryScale: "ZPS 8.2", status: "Confirmed", institution: "Ofisi ya Mkuu wa Mkoa wa Kusini Unguja", education: "PhD Public Administration" },
  { name: "Dkt. Mwalimu Fatma Khamis", gender: "Female", zanId: "1906600570", cadre: "District Commissioner", department: "Local Government", salaryScale: "ZPS 7.1", status: "Confirmed", institution: "Ofisi ya Mkuu wa Mkoa wa Kusini Unguja", education: "PhD Political Science" },
  { name: "Mwanakijiji Hassan Omar", gender: "Male", zanId: "1907650580", cadre: "Ward Development Officer", department: "Community Development", salaryScale: "ZPS 4.1", status: "On Probation", institution: "Ofisi ya Mkuu wa Mkoa wa Kusini Unguja", education: "Diploma in Social Work" },
];

async function main() {
    console.log('Adding the 3 missing regional office employees...');
    
    const institutions = await db.institution.findMany();
    const institutionMap = new Map(institutions.map(inst => [inst.name, inst.id]));
    const currentEmployeeCount = await db.employee.count();
    
    let addedCount = 0;
    
    for (const empData of MISSING_EMPLOYEES) {
        const institutionId = institutionMap.get(empData.institution);
        
        if (!institutionId) {
            console.error(`Institution still not found: ${empData.institution}`);
            continue;
        }
        
        const birthYear = 1960 + Math.floor(Math.random() * 25);
        const employmentYear = birthYear + 25 + Math.floor(Math.random() * 15);
        const dateOfBirth = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        const employmentDate = new Date(employmentYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        const retirementDate = new Date(dateOfBirth.getTime());
        retirementDate.setFullYear(retirementDate.getFullYear() + 60);
        const confirmationDate = empData.status === 'Confirmed' ? 
            new Date(employmentDate.getTime() + (365 * 24 * 60 * 60 * 1000)) : null;
        
        const phoneNumber = '0777-' + Math.floor(Math.random() * 900000 + 100000);
        const zssfNumber = 'ZSSF' + String(currentEmployeeCount + addedCount + 1).padStart(3, '0');
        const payrollNumber = 'PAY' + String(currentEmployeeCount + addedCount + 1).padStart(4, '0');
        
        try {
            const employee = await db.employee.create({
                data: {
                    id: `emp_${String(currentEmployeeCount + addedCount + 1).padStart(3, '0')}`,
                    employeeEntityId: `emp_entity_${currentEmployeeCount + addedCount + 1}`,
                    name: empData.name,
                    gender: empData.gender,
                    zanId: empData.zanId,
                    zssfNumber: zssfNumber,
                    payrollNumber: payrollNumber,
                    phoneNumber: phoneNumber,
                    contactAddress: `P.O. Box ${Math.floor(Math.random() * 9000) + 1000}, Koani, Zanzibar`,
                    dateOfBirth: dateOfBirth,
                    placeOfBirth: "Koani",
                    region: "Kusini Unguja",
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
                    currentWorkplace: "Regional Office",
                    employmentDate: employmentDate,
                    confirmationDate: confirmationDate,
                    retirementDate: retirementDate,
                    ardhilHaliUrl: `https://placehold.co/ardhil-hali-${currentEmployeeCount + addedCount + 1}.pdf`,
                    confirmationLetterUrl: empData.status === 'Confirmed' ? `https://placehold.co/confirmation-${currentEmployeeCount + addedCount + 1}.pdf` : null,
                    jobContractUrl: `https://placehold.co/contract-${currentEmployeeCount + addedCount + 1}.pdf`,
                    birthCertificateUrl: `https://placehold.co/birth-cert-${currentEmployeeCount + addedCount + 1}.pdf`,
                    profileImageUrl: `https://placehold.co/150x150.png?text=${empData.name.split(' ').slice(0,2).map(n => n[0]).join('')}`,
                    institutionId: institutionId,
                },
            });
            
            // Add education certificate
            await db.employeeCertificate.create({
                data: {
                    type: empData.education.includes('PhD') ? 'PhD' : 'Diploma',
                    name: empData.education,
                    url: `https://placehold.co/${empData.education.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${currentEmployeeCount + addedCount + 1}.pdf`,
                    employeeId: employee.id,
                }
            });
            
            addedCount++;
            console.log(`✓ Added employee ${currentEmployeeCount + addedCount}: ${empData.name}`);
            
        } catch (error) {
            console.error(`✗ Error creating employee ${empData.name}:`, error.message);
        }
    }
    
    console.log(`\n✅ Added ${addedCount} regional office employees successfully!`);
}

main()
    .catch((e) => {
        console.error('❌ Fix failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });