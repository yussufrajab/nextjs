import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get sample employees for load testing
  const employees = await prisma.employee.findMany({
    take: 20,
    select: {
      id: true,
      name: true,
      zanId: true,
      status: true,
      cadre: true,
      department: true,
    },
  });

  console.log('=== Test Employees ===');
  console.log(JSON.stringify(employees, null, 2));

  // Also get institutions
  const institutions = await prisma.institution.findMany({
    take: 10,
    select: {
      id: true,
      name: true,
    },
  });

  console.log('\n=== Test Institutions ===');
  console.log(JSON.stringify(institutions, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
