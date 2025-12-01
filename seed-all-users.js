const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

// Import constants
const ROLES = {
  HRO: "HRO",
  HHRMD: "HHRMD",
  HRMO: "HRMO",
  DO: "DO",
  EMPLOYEE: "EMPLOYEE",
  CSCS: "CSCS",
  HRRP: "HRRP",
  PO: "PO",
  ADMIN: "Admin",
};

const commissionName = 'TUME YA UTUMISHI SERIKALINI';

const INSTITUTIONS = [
  { name: 'TUME YA UTUMISHI SERIKALINI' },
  { name: 'OFISI YA RAIS, FEDHA NA MIPANGO' },
  { name: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI' },
  { name: 'WIZARA YA AFYA' },
];

const USERS = [
  // Commission Users
  { username: "akassim", name: "Amina Kassim", role: ROLES.ADMIN, institution: commissionName },
  { username: "zhaji", name: "Zaituni Haji", role: ROLES.CSCS, institution: commissionName },
  { username: "skhamis", name: "Safia Khamis", role: ROLES.HHRMD, institution: commissionName },
  { username: "fiddi", name: "Fauzia Iddi", role: ROLES.HRMO, institution: commissionName },
  { username: "mussi", name: "Maimuna Ussi", role: ROLES.DO, institution: commissionName },
  { username: "mishak", name: "Mwanakombo Is-hak", role: ROLES.PO, institution: commissionName },
  { username: "khamadi", name: "Khamis Hamadi", role: ROLES.HRRP, institution: commissionName },
  
  // HROs
  { username: "hro_commission", name: "HRO (Tume)", role: ROLES.HRO, institution: commissionName },
  { username: "kmnyonge", name: "Khamis Mnyonge", role: ROLES.HRO, institution: 'OFISI YA RAIS, FEDHA NA MIPANGO' },
  { username: "ahmedm", name: "Ahmed Mohammed", role: ROLES.HRO, institution: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI' },
  { username: "mariamj", name: "Mariam Juma", role: ROLES.HRO, institution: 'WIZARA YA AFYA' },
  
  // Employee users
  { username: "alijuma", name: "Ali Juma Ali", role: ROLES.EMPLOYEE, institution: 'OFISI YA RAIS, FEDHA NA MIPANGO' },
  { username: "khadijanassor", name: "Khadija Nassor", role: ROLES.EMPLOYEE, institution: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI' },
  { username: "yussufmakame", name: "Yussuf Makame", role: ROLES.EMPLOYEE, institution: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI' },
];

async function main() {
    console.log('Creating institutions...');
    
    // Create institutions
    for (const institution of INSTITUTIONS) {
        await db.institution.upsert({
            where: { name: institution.name },
            update: {},
            create: { name: institution.name },
        });
    }
    
    console.log('Institutions created successfully!');
    
    // Get institution IDs
    const institutions = await db.institution.findMany();
    const institutionMap = new Map(institutions.map(inst => [inst.name, inst.id]));
    
    console.log('Creating users...');
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Create users
    for (const user of USERS) {
        const institutionId = institutionMap.get(user.institution);
        
        if (!institutionId) {
            console.warn(`Could not find institution: ${user.institution} for user ${user.name}`);
            continue;
        }
        
        try {
            await db.user.upsert({
                where: { username: user.username },
                update: {
                    name: user.name,
                    role: user.role,
                    active: true,
                    institutionId: institutionId,
                },
                create: {
                    name: user.name,
                    username: user.username,
                    password: hashedPassword,
                    role: user.role,
                    active: true,
                    institutionId: institutionId,
                },
            });
            console.log(`Created/Updated user: ${user.username}`);
        } catch (error) {
            console.error(`Error creating user ${user.username}:`, error.message);
        }
    }
    
    console.log('All users created successfully!');
    
    // List all users
    const allUsers = await db.user.findMany({
        select: { username: true, name: true, role: true },
    });
    
    console.log('\nAll users in database:');
    console.table(allUsers);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });