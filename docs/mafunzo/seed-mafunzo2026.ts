import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/password-hash';

const db = new PrismaClient();

// Map document institution names to exact database institution names
const INSTITUTION_NAME_MAP: Record<string, string> = {
  'MSAJILI WA HAZINA': 'Ofisi ya Msajili wa Hazina',
  'AFISI YA MKURUGENZI WA MASHTAKA': 'AFISI YA MKURUGENZI WA MASHTAKA',
  'AFISI YA MWANASHERIA MKUU': 'AFISI YA MWANASHERIA MKUU',
  'Tume ya Mipango': 'Tume ya Mipango',
  'wakala wa majengo': 'WAKALA WA MAJENGO ZANZIBAR',
  'WAKALA WA MAJENGO': 'WAKALA WA MAJENGO ZANZIBAR',
  'TUME YA MAADILI YA VIONGOZI WA UMMA': 'TUME YA MAADILI YA VIONGOZI WA UMMA',
  'OFISI YA MKAGUZI MKUU WA ELIMU': 'Ofisi ya Mkaguzi wa Elimu',
  'OFISI YA MHASIBU MKUU WA SERIKALI': 'Ofisi ya Mhasibu Mkuu wa Serikali',
  'OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI': 'OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI',
  'Tume ya mipango Zanzibar': 'Tume ya Mipango',
  'WAKALA WA VIPIMO ZANZIBAR': 'Wakala wa Vipimo Zanzibar',
  'Taasisi ya Elimu ya Zanzibar': 'TAASISI YA ELIMU ZANZIBAR',
  'TAASISI YA ELIMU YA ZANZIBAR': 'TAASISI YA ELIMU ZANZIBAR',
  'ofisi ya mufti': 'OFISI YA MUFTI MKUU WA ZANZIBAR',
};

interface MafunzoUser {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  institutionDocName: string;
}

const MAFUNZO_USERS: MafunzoUser[] = [
  { name: 'FARIDA HAJI ALI', username: 'fhali', email: 'farida.ali@tro.go.tz', phone: '0774537075', password: 'Unguja@2070', institutionDocName: 'MSAJILI WA HAZINA' },
  { name: 'MAKAME KHAMIS MAKAME', username: 'MAKAME', email: 'makame.makame@dppznz.go.tz', phone: '0777207624', password: 'Makame@123', institutionDocName: 'AFISI YA MKURUGENZI WA MASHTAKA' },
  { name: 'AMINA MASOUD OMAR', username: 'aminaomar', email: 'amina.omar@agcz.go.tz', phone: '0777705975', password: 'Utumishi@2016', institutionDocName: 'AFISI YA MWANASHERIA MKUU' },
  { name: 'Ali Nassor Ali', username: 'aliali', email: 'ali.ali@planningznz.go.tz', phone: '0773141683', password: 'Afisautumishi22@', institutionDocName: 'Tume ya Mipango' },
  { name: 'FATMA HASSAN AMAN', username: 'fatmaaman', email: 'fatma.aman@agcz.go.tz', phone: '0773720447', password: 'mazizini@2026', institutionDocName: 'AFISI YA MWANASHERIA MKUU' },
  { name: 'kazija kaiza omar', username: 'kazija', email: 'kazija.omar@zba.go.tz', phone: '0774866848', password: 'Unguja@123', institutionDocName: 'wakala wa majengo' },
  { name: 'Alye Said Abdalla', username: 'alyeabdalla', email: 'alye.abdalla@ethicscommission.go.tz', phone: '0772099885', password: 'Maadili@123', institutionDocName: 'TUME YA MAADILI YA VIONGOZI WA UMMA' },
  { name: 'Khalid Haruna Ussi', username: 'Khalid', email: 'khalid.ussi@ocie.go.tz', phone: '0777244360', password: 'Khalid@1234', institutionDocName: 'OFISI YA MKAGUZI MKUU WA ELIMU' },
  { name: 'Mwadawa Ibrahim Othman', username: 'Othman', email: 'mwandawa.othman@dppznz.go.tz', phone: '0772464348', password: 'Utumishi@1234', institutionDocName: 'AFISI YA MKURUGENZI WA MASHTAKA' },
  { name: 'Zuhura Abdulla Salim', username: 'zuhura', email: 'zuhura.salim@zba.go.tz', phone: '0777439768', password: '@Ummukulthum2', institutionDocName: 'WAKALA WA MAJENGO' },
  { name: 'Khamis Mohamed Sheikh', username: 'khamismohamed', email: 'khamis.sheh@mofzanzibar.go.tz', phone: '0777497585', password: 'Khamis@123456', institutionDocName: 'OFISI YA MHASIBU MKUU WA SERIKALI' },
  { name: 'shindano omar khamis', username: 'shindano', email: 'shindano.khamis@oiagsmz.go.tz', phone: '0772584957', password: 'Khamis@123', institutionDocName: 'OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI' },
  { name: 'Amina Omar Wahab', username: 'aminawahab', email: 'amina.wahab@planningznz.go.tz', phone: '0777454515', password: 'Amina@26', institutionDocName: 'Tume ya mipango Zanzibar' },
  { name: "Moh'd Ali Haji", username: 'Mohd', email: 'utumishi@ocie.go.tz', phone: '0772728230', password: "Moh'd@2028", institutionDocName: 'OFISI YA MKAGUZI MKUU WA ELIMU' },
  { name: 'Fatma Simai Haji', username: 'fatmasimaihaji', email: 'fatma.haji@zawemasmz.go.tz', phone: '0774864747', password: 'Fatma@47', institutionDocName: 'WAKALA WA VIPIMO ZANZIBAR' },
  { name: 'Mwanakhamis Juma Mbarouk', username: 'mwanakhamisjuma', email: 'mwanakhamis.mbarouk@zie.go.tz', phone: '0777882590', password: 'Fatma@1990', institutionDocName: 'Taasisi ya Elimu ya Zanzibar' },
  { name: 'mwatima ali mkanga', username: 'mwatima', email: 'mwatima.mkanga@muftizanzibar.go.tz', phone: '0772280938', password: 'mufti@2026', institutionDocName: 'ofisi ya mufti' },
  { name: 'Zainab Saadalla Abdalla', username: 'zainabsaadallah', email: 'zainab.abdulla@zie.go.tz', phone: '0777469384', password: 'zainab@2026', institutionDocName: 'TAASISI YA ELIMU YA ZANZIBAR' },
];

async function main() {
  console.log('Seeding mafunzo 2026 training users...');

  const institutions = await db.institution.findMany();
  const institutionMap = new Map(institutions.map(inst => [inst.name, inst.id]));

  for (const user of MAFUNZO_USERS) {
    const dbInstitutionName = INSTITUTION_NAME_MAP[user.institutionDocName];
    if (!dbInstitutionName) {
      console.warn(`No mapping found for institution: ${user.institutionDocName}. Skipping user: ${user.name}`);
      continue;
    }

    const institutionId = institutionMap.get(dbInstitutionName);
    if (!institutionId) {
      console.warn(`Institution "${dbInstitutionName}" not found in database. Skipping user: ${user.name}`);
      continue;
    }

    try {
      await db.user.upsert({
        where: { username: user.username },
        update: {
          name: user.name,
          email: user.email,
          phoneNumber: user.phone,
          password: await hashPassword(user.password),
          institutionId: institutionId,
          active: true,
        },
        create: {
          id: crypto.randomUUID(),
          name: user.name,
          username: user.username,
          email: user.email,
          phoneNumber: user.phone,
          password: await hashPassword(user.password),
          role: 'HRO',
          active: true,
          institutionId: institutionId,
          updatedAt: new Date(),
        },
      });
      console.log(`✓ Upserted user: ${user.username} (${user.name}) -> ${dbInstitutionName}`);
    } catch (error) {
      console.error(`✗ Error upserting user ${user.username}:`, error);
    }
  }

  console.log('Mafunzo 2026 seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });