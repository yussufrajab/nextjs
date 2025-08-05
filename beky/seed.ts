import { PrismaClient } from '@prisma/client'
import { USERS, INSTITUTIONS, EMPLOYEES } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const db = new PrismaClient()

async function main() {
    console.log('Seeding database...');

    console.log('Seeding institutions...');
    for (const institution of INSTITUTIONS) {
        await db.institution.upsert({
            where: { name: institution.name },
            update: {},
            create: {
                name: institution.name,
            },
        });
    }
    console.log('Institutions seeded successfully!');

    const seededInstitutions = await db.institution.findMany();
    const institutionMap = new Map(seededInstitutions.map(inst => [inst.name, inst.id]));
    
    console.log('Seeding employees...');
    for (const emp of EMPLOYEES) {
        const institutionId = institutionMap.get(emp.institution || 'TUME YA UTUMISHI SERIKALINI');
        if (!institutionId) {
            console.warn(`Could not find institution for employee: ${emp.name}. Skipping.`);
            continue;
        }

        const employeeData = {
            id: emp.id,
            name: emp.name,
            gender: emp.gender,
            zanId: emp.zanId,
            status: emp.status,
            cadre: emp.cadre,
            department: emp.department,
            employmentDate: emp.employmentDate ? new Date(emp.employmentDate) : null,
            confirmationDate: emp.confirmationDate ? new Date(emp.confirmationDate) : null,
            dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth) : null,
            institutionId: institutionId,
            payrollNumber: emp.payrollNumber,
            zssfNumber: emp.zssfNumber,
        };

        const createdEmployee = await db.employee.upsert({
            where: { zanId: emp.zanId },
            update: employeeData,
            create: employeeData,
        });

        if (emp.certificates && emp.certificates.length > 0) {
            for (const cert of emp.certificates) {
                await db.employeeCertificate.create({
                    data: {
                        ...cert,
                        employeeId: createdEmployee.id,
                    }
                });
            }
        }
    }
    console.log('Employees seeded successfully!');

    console.log('Seeding users and linking to employees...');
    const salt = await bcrypt.genSalt(10);

    for (const user of USERS) {
        const institutionName = user.institution || 'TUME YA UTUMISHI SERIKALINI';
        const institutionId = institutionMap.get(institutionName);

        if (!institutionId) {
            console.warn(`Could not find institution ID for: ${institutionName}. Skipping user: ${user.name}`);
            continue;
        }

        await db.user.upsert({
            where: { username: user.username },
            update: {},
            create: {
                name: user.name,
                username: user.username,
                password: await bcrypt.hash('password123', salt),
                role: user.role as string,
                active: true,
                employeeId: user.employeeId || null,
                institutionId: institutionId,
            },
        });
    }
    console.log('Users seeded successfully!');
    console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
