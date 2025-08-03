const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

async function main() {
    console.log('Creating institutions...');
    
    // Create TUME YA UTUMISHI SERIKALINI institution
    const institution = await db.institution.upsert({
        where: { name: 'TUME YA UTUMISHI SERIKALINI' },
        update: {},
        create: {
            name: 'TUME YA UTUMISHI SERIKALINI',
        },
    });
    
    console.log('Creating user skhamis...');
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    const user = await db.user.upsert({
        where: { username: 'skhamis' },
        update: {
            password: hashedPassword,
        },
        create: {
            name: 'Safia Khamis',
            username: 'skhamis',
            password: hashedPassword,
            role: 'HHRMD',
            active: true,
            institutionId: institution.id,
        },
    });
    
    console.log('User created successfully:', user.username);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });