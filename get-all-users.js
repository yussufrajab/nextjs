const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function getAllUsers() {
  try {
    const users = await db.user.findMany({
      select: {
        username: true,
        name: true,
        role: true,
        active: true,
        institution: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log('=== ALL USERS IN DATABASE ===');
    console.log('Total Users:', users.length);
    console.log('');
    
    // Group by role
    const roleGroups = {};
    users.forEach(user => {
      if (!roleGroups[user.role]) {
        roleGroups[user.role] = [];
      }
      roleGroups[user.role].push(user);
    });

    // Display by role
    Object.keys(roleGroups).sort().forEach(role => {
      console.log(`--- ${role} USERS ---`);
      roleGroups[role].forEach(user => {
        console.log(`Username: ${user.username}`);
        console.log(`Name: ${user.name}`);
        console.log(`Password: password123`);
        console.log(`Active: ${user.active}`);
        console.log(`Institution: ${user.institution.name}`);
        console.log('---');
      });
      console.log('');
    });

    // Summary by role
    console.log('=== SUMMARY BY ROLE ===');
    Object.keys(roleGroups).sort().forEach(role => {
      console.log(`${role}: ${roleGroups[role].length} users`);
    });

    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('All users use the same password: password123');
    console.log('');
    console.log('Key Admin/Management Users:');
    console.log('- akassim (Admin) - Full system administration');
    console.log('- skhamis (HHRMD) - Head of HR Management Department');
    console.log('- zhaji (CSCS) - Civil Service Commission Secretary');
    console.log('- hro_commission (HRO) - Human Resource Officer at Commission');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

getAllUsers();