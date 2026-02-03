const { PrismaClient } = require('@prisma/client');

async function testDB() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing database connection...');
    const users = await prisma.user.findMany({ take: 1 });
    console.log('✓ Database connection successful!');
    console.log('Found user:', users[0]?.username);
  } catch (error) {
    console.error('✗ Database connection failed:',  error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDB();
