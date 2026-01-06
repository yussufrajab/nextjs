import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const execAsync = promisify(exec);

async function globalSetup() {
  console.log('🔧 Setting up E2E test environment...');

  // 1. Set DATABASE_URL for test database
  process.env.DATABASE_URL =
    'postgresql://postgres:Mamlaka2020@localhost:5432/csms_test?schema=public';

  // 2. Sync test database schema (using db push to match Prisma schema exactly)
  console.log('📦 Syncing test database schema...');
  try {
    await execAsync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
      env: {
        ...process.env,
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
      },
    });
  } catch (error) {
    console.error('Error syncing database schema:', error);
    throw error;
  }

  // 4. Seed test data
  console.log('🌱 Seeding test data...');
  await seedTestData();

  console.log('✅ E2E test environment ready!');
}

async function seedTestData() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    // Use raw SQL to avoid schema validation issues
    // Create test institution
    await prisma.$executeRaw`
      INSERT INTO "Institution" (id, name)
      VALUES ('test-institution-1', 'Test Ministry of Health')
    `;

    console.log('✅ Test institution created');

    // Create test users for different roles
    const hashedPassword = await bcrypt.hash('Test@1234', 10);
    const now = new Date();
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 90);

    // HRO user
    await prisma.$executeRaw`
      INSERT INTO "User" (id, name, username, password, role, active, "institutionId", "createdAt", "updatedAt")
      VALUES ('test-hro-1', 'Test HRO', 'test_hro', ${hashedPassword}, 'HRO', true, 'test-institution-1', ${now}, ${now})
    `;

    // HRMO user
    await prisma.$executeRaw`
      INSERT INTO "User" (id, name, username, password, role, active, "institutionId", "createdAt", "updatedAt")
      VALUES ('test-hrmo-1', 'Test HRMO', 'test_hrmo', ${hashedPassword}, 'HRMO', true, 'test-institution-1', ${now}, ${now})
    `;

    // HHRMD user
    await prisma.$executeRaw`
      INSERT INTO "User" (id, name, username, password, role, active, "institutionId", "createdAt", "updatedAt")
      VALUES ('test-hhrmd-1', 'Test HHRMD', 'test_hhrmd', ${hashedPassword}, 'HHRMD', true, 'test-institution-1', ${now}, ${now})
    `;

    console.log('✅ Test users created (HRO, HRMO, HHRMD)');

    // Create eligible test employees (with 5+ years service)
    const employmentDate = new Date('2018-06-01');
    for (let i = 1; i <= 3; i++) {
      const gender = i % 2 === 0 ? 'Male' : 'Female';
      const zanId = `ELIG-${i.toString().padStart(8, '0')}`;
      await prisma.$executeRaw`
        INSERT INTO "Employee" (id, name, gender, "zanId", "payrollNumber", cadre, "salaryScale", ministry, department, "appointmentType", "contractType", "employmentDate", status, "institutionId")
        VALUES (${`test-employee-eligible-${i}`}, ${`Eligible Employee ${i}`}, ${gender}, ${zanId}, ${`PAY-ELIG-${i}`}, 'Officer Grade III', 'PGSS 8', 'Test Ministry of Health', 'Administration', 'Permanent', 'Full-Time', ${employmentDate}, 'Active', 'test-institution-1')
      `;
    }

    console.log('✅ Test employees created (3 eligible)');

    // Create employee on probation (for negative tests)
    const probationEmploymentDate = new Date('2020-01-15');
    await prisma.$executeRaw`
      INSERT INTO "Employee" (id, name, gender, "zanId", "payrollNumber", cadre, "salaryScale", ministry, department, "appointmentType", "contractType", "employmentDate", status, "institutionId")
      VALUES ('test-employee-probation', 'John Doe', 'Male', 'TEST-12345678', 'PAY-001', 'Assistant Officer Grade II', 'PGSS 7', 'Test Ministry of Health', 'Human Resources', 'Permanent', 'Full-Time', ${probationEmploymentDate}, 'On Probation', 'test-institution-1')
    `;

    console.log('✅ Test employee on probation created');

    // Create EMPLOYEE user linked to probation employee
    await prisma.$executeRaw`
      INSERT INTO "User" (id, name, username, password, role, active, "employeeId", "institutionId", "createdAt", "updatedAt")
      VALUES ('test-employee-user-1', 'John Doe', 'test_employee', ${hashedPassword}, 'EMPLOYEE', true, 'test-employee-probation', 'test-institution-1', ${now}, ${now})
    `;

    console.log('✅ Test EMPLOYEE user created');

    console.log('✅ Test data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
