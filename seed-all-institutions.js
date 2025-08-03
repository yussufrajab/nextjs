const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

const INSTITUTIONS = [
    { name: 'Ofisi ya Msajili wa Hazina' },
    { name: 'Ofisi ya Mkuu wa Mkoa wa Kusini Unguja' },
    { name: 'Wakala wa Vipimo Zanzibar' },
    { name: 'WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO' },
    { name: 'KAMISHENI YA UTUMISHI WA UMMA' },
    { name: 'WAKALA WA SERIKALI MTANDAO (eGAZ)' },
    { name: 'OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI' },
    { name: 'Kamisheni ya Ardhi Zanzibar' },
    { name: 'Ofisi ya Mhasibu Mkuu wa Serikali' },
    { name: 'TAASISI YA NYARAKA NA KUMBUKUMBU' },
    { name: 'AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI' },
    { name: 'KAMISHENI YA UTALII ZANZIBAR' },
    { name: 'SEKRETARIETI YA AJIRA .' },
    { name: 'TAASISI YA ELIMU YA ZANZIBAR' },
    { name: 'KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR' },
    { name: 'WAKALA WA MAJENGO ZANZIBAR' },
    { name: 'OFISI YA RAIS, FEDHA NA MIPANGO' },
    { name: 'WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO' },
    { name: 'WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI' },
    { name: 'OFISI YA MAKAMO WA KWANZA WA RAISI' },
    { name: 'WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA' },
    { name: 'SEKRETARIETI YA AJIRA' },
    { name: 'OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ' },
    { name: 'OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA' },
    { name: 'WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO' },
    { name: 'TUME YA UCHAGUZI YA ZANZIBAR' },
    { name: 'OFISI YA MAKAMO WA PILI WA RAISI' },
    { name: 'WIZARA YA UCHUMI WA BULUU NA UVUVI' },
    { name: 'OFISI YA MUFTI MKUU WA ZANZIBAR' },
    { name: 'MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR' },
    { name: 'WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR' },
    { name: 'WIZARA YA UTALII NA MAMBO YA KALE' },
    { name: 'OFISI YA RAIS - IKULU' },
    { name: 'MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR' },
    { name: 'TUME YA MAADILI YA VIONGOZI WA UMMA' },
    { name: 'TUME YA UTUMISHI SERIKALINI' },
    { name: 'AFISI YA MKURUGENZI WA MASHTAKA' },
    { name: 'AFISI YA MWANASHERIA MKUU' },
    { name: 'WIZARA YA MAJI NISHATI NA MADINI' },
    { name: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI' },
    { name: 'WIZARA YA AFYA' }
];

async function main() {
    console.log('Seeding all 41 institutions...');
    
    let count = 0;
    for (const institution of INSTITUTIONS) {
        try {
            await db.institution.upsert({
                where: { name: institution.name },
                update: {},
                create: { name: institution.name },
            });
            count++;
            console.log(`[${count}/${INSTITUTIONS.length}] Created/Updated: ${institution.name}`);
        } catch (error) {
            console.error(`Error creating institution ${institution.name}:`, error.message);
        }
    }
    
    console.log(`\nSuccessfully seeded ${count} institutions!`);
    
    // Show total count
    const totalInstitutions = await db.institution.count();
    console.log(`Total institutions in database: ${totalInstitutions}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });