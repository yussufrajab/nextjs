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
  // users28.md institution mappings
  'BODI YA HUDUMA ZA MAKTABA': 'Bodi ya Huduma za Maktaba',
  'BARAZA LA MITIHANI LA ZANZIBAR': 'Baraza la Mitihani',
  'KAMISHENI YA ARDHI - ZANZIBAR': 'KAMISHENI YA ARDHI ZANZIBAR',
  'Mnazi mmoja Hospital': 'Hospitali ya Mnazi Mmoja',
  'kamisheni ya kukabiliana na maafa': 'KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR',
  'CHUO CHA KIISLAM': 'Chuo cha Kiislamu',
  'Taasisi ya Utafiti wa Uvuvi na Maliasili za Baharini Zanzibar': 'Taasisi ya Utafiti wa Uvuvi (ZAFIRI)',
  'WAKALA WA UWEZESHAJI WANANCHI KIUCHUM ZANZIBAR': 'Mamlaka ya Uwezeshaji Wananchi Kiuchumi (ZEA)',
  'Tume ya Utumishi Serikalini': 'TUME YA UTUMISHI SERIKALINI',
  'Tume ya Ushindani Halali wa Biashara': 'Tume ya Ushindani Halali wa Biashara',
  'Nyaraka': 'TAASISI YA NYARAKA NA KUMBUKUMBU',
  'kamisheni ya kazi': 'Kamisheni ya Kazi',
  'MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR': 'MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR',
  'Wakala wa barabara': 'Wakala wa Barabara',
  'MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU UCHUMI ZZANZIBAR': 'MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR',
  // users29.md institution mappings
  'wizara ya uvuvi': 'WIZARA YA UCHUMI WA BULUU NA UVUVI',
  'BARAZA LA JIJI LA ZANZIBAR': 'Baraza la Jiji',
  'Baraza la Jiji': 'Baraza la Jiji',
  'BARAZA LA MANISPAA MJINI': 'Baraza la Manispaa Mjini Unguja',
  'OFISI YA MKUU WA WILAYA MJINI UNGUJA': 'Ofisi ya Mkuu wa Mkoa wa Kusini Unguja',
  "BARAZA LA MANISPAA KASKAZINI 'A' UNGUJA": 'Baraza la Mji Kaskazini A Unguja',
  'Afisi ya Mkuu wa Mkoa Mjini Magharibi': 'Ofisi ya Mkuu wa Mkoa wa Mjini Magharibi Unguja',
  'kamisheni ya Utumishi wa Umma': 'KAMISHENI YA UTUMISHI WA UMMA',
  'MKOA KUSINI UNGUJA': 'Ofisi ya Mkuu wa Mkoa wa Kusini Unguja',
  'WILAYA YA MAGHARIBI "B"': 'Baraza la Manispaa Magharibi B',
  'AFISI YA MKUU WA MKOA MJINI MAGHARIBI': 'Ofisi ya Mkuu wa Mkoa wa Mjini Magharibi Unguja',
  'Wilaya ya MagharibiA': 'Baraza la Manispaa Magharibi A',
  'WILAYA YA KUSINI': 'Halmashauri ya Wilaya ya Kusini Unguja',
  'BARAZA LA MANISPAA KATI': 'Baraza la Mji Kati Unguja',
  'TUME YA UTUMISHI SERIKALINI': 'TUME YA UTUMISHI SERIKALINI',
  'BARAZA LA MANISPAA MAGHARIB "B"': 'Baraza la Manispaa Magharibi B',
  // users30.md institution mappings
  'Mkoa Kaskazini unguja': 'Ofisi ya Mkuu wa Mkoa wa Kaskazini Unguja',
  'Baraza la Mji Kaskazini "B" Unguja': 'Baraza la Mji Kaskazini B Unguja',
  // users.md institution mappings
  'Tume ya Maadili ya viongozi wa Umma': 'TUME YA MAADILI YA VIONGOZI WA UMMA',
  'WIZARA YA AFYA': 'WIZARA YA AFYA',
  'Wizara ya Habari, Sanaa, Utamaduni na Michezo': 'WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO',
  'WIZARA YA MAJI NISHATI NA MADINI': 'WIZARA YA MAJI NISHATI NA MADINI',
  'WIZARA YA ELIMU NA MAFUNZO YA AMALI ZANZIBAR': 'WIZARA YA ELIMU NA MAFUNZO YA AMALI',
  'OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUM ZA SMZ': 'OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ',
  'WIZARA YA UCHUMI WA BULUU NA UVUVI': 'WIZARA YA UCHUMI WA BULUU NA UVUVI',
  'TUME YA UCHAGUZI': 'TUME YA UCHAGUZI YA ZANZIBAR',
  'WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI': 'WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR',
  'WIZARA YA MAENDELEO YA JAMII, JINSIA, WAZEE NA WATOTO': 'WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO',
  'WIZARA YA UJENZI NA UCHUKUZI': 'WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI',
  'Wizara Kilimo Umwagiliaji Maliasili na Mifugo': 'WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO',
  'WIZARA YA VIJANA AJIRA NA UWEZESHAJI': 'AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI',
  'Wakala wa Serikali wa Huduma za Matrekta na Zana na Kilimo': 'Wakala wa Matrekta',
  'wizara ya Biashara na Maendeleo ya Makaazi': 'WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA',
  'OR- KATIBA,SHERIA, UTUMISHI NA UTAWALA BORA': 'OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA',
  'Ofisi ya Msajili wa Hazina': 'Ofisi ya Msajili wa Hazina',
  'WIZARA YA FEDHA NA MIPANGO': 'OFISI YA RAIS, FEDHA NA MIPANGO',
  'WIZARA YA ELIMU NA MAFUNZO YA AMALI': 'WIZARA YA ELIMU NA MAFUNZO YA AMALI',
  'KAMISHENI YA UTUMISHI WA UMMA': 'KAMISHENI YA UTUMISHI WA UMMA',
  'OFISI YA RAISI IKULU': 'OFISI YA RAIS - IKULU',
  'Taasisi ya anyaraka na kumbukumbu': 'TAASISI YA NYARAKA NA KUMBUKUMBU',
  'ofisi ya makamo wa kwanza wa Rais': 'OFISI YA MAKAMO WA KWANZA WA RAISI',
  'OFISI YA MUFTI MKUU ZANZIBAR': 'OFISI YA MUFTI MKUU WA ZANZIBAR',
  'Kamisheni ya Wakfu na Mali ya Amana': 'Kamisheni ya Wakfu na Mali ya Amana',
  'OFISI YA MRAJISI WA ELIMU ZANZIBAR': 'OFISI YA MRAJISI WA ELIMU ZANZIBAR',
  'OFISI YA BARAZA LA ELIMU NA MRAJIS WA ELIMU': 'OFISI YA BARAZA LA ELIMU NA MRAJIS WA ELIMU',
  // users.md (mafunzo) institution mappings - uppercase variants for case-sensitive lookup
  'KAMISHENI YA KUKABILIANA NA MAAFA': 'KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR',
  'TUME YA USHINDANI HALALI WA BIASHARA': 'Tume ya Ushindani Halali wa Biashara',
  // users.md (mafunzo) institution mappings
  'BARAZA LA MITIHANI ZANZIABAR': 'Baraza la Mitihani',
  'AFISI YA MSAJILI WA HAKIMIIKI - COSOZA': 'Ofisi ya Hatimiliki (COSOZA)',
  'wakala wa huduma za matrekta': 'Wakala wa Matrekta',
  'WIZARA YA KAZI': 'Kamisheni ya Kazi',
  'WILAYA YA MAGHARIBI A': 'Baraza la Manispaa Magharibi A',
  'MAMLAKA YA USAFIRI NA USALAMA BARABARANI': 'Wakala wa Barabara',
  'KAMISHENI YA ARDHI': 'KAMISHENI YA ARDHI ZANZIBAR',
  'Wilaya ya Kaskazini B': 'Ofisi ya Mkuu wa Wilaya ya Kaskazini B',
  'WIZARA YA ELIMU': 'WIZARA YA ELIMU NA MAFUNZO YA AMALI',
  'OFISI YA MAKAMU WA PILI WA RAIS': 'OFISI YA MAKAMO WA PILI WA RAISI',
  'Bodi ya Huduma za Maktaba Zanzibar': 'Bodi ya Huduma za Maktaba',
  'ZAECA': 'MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR',
  'BARAZA LA MANISPA MAGHARIBI A': 'Baraza la Manispaa Magharibi A',
  'Mamlaka ya Serikali Mtandao Zanzibar': 'Mamlaka ya Serikali Mtandao (eGAZ)',
  'Wakala wa Barabara': 'Wakala wa Barabara',
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
  // users28.md entries
  { name: 'Mwajuma Mabrouk Al', username: 'Mwajumamabrouk', email: 'mwajuma.ali@zls.go.tz', phone: '0774099797', password: 'mwajuma@123', institutionDocName: 'BODI YA HUDUMA ZA MAKTABA' },
  { name: 'THUREYA HAMAD MAKAME', username: 'THUREYA', email: 'said.ali@bmz.go.tz', phone: '0772983684', password: 'Bmz@2026', institutionDocName: 'BARAZA LA MITIHANI LA ZANZIBAR' },
  { name: 'FAIZA HASSAN BAKAR', username: 'faizabakar', email: 'faiza.bakar@kamisheniardhi.go.tz', phone: '0777481826', password: 'Faiza@123', institutionDocName: 'KAMISHENI YA ARDHI - ZANZIBAR' },
  { name: 'mwanahuri machano haji', username: 'mwanahuri', email: 'mwanahuri.haji@mmh.go.tz', phone: '0774274028', password: 'Mwana@1991', institutionDocName: 'Mnazi mmoja Hospital' },
  { name: 'wasila mohamed ussi', username: 'aziza', email: 'wasila.ussi@maafaznz.go.tz', phone: '0772834500', password: 'wasmuu@1988', institutionDocName: 'kamisheni ya kukabiliana na maafa' },
  { name: 'ASHA MAKAME ALI', username: 'ashaali', email: 'asha.ali@moez.go.tz', phone: '0773234116', password: 'Asha@1968', institutionDocName: 'CHUO CHA KIISLAM' },
  { name: 'Tatu Mohamed Naim', username: 'tatunaim', email: 'tatu.naim@zafiri.go.tz', phone: '0773151745', password: 'Tatu@1234', institutionDocName: 'Taasisi ya Utafiti wa Uvuvi na Maliasili za Baharini Zanzibar' },
  { name: 'Khadija Hassan Chum', username: 'ukhtidida', email: 'khadija.chum@zeeasmz.go.tz', phone: '0773464664', password: 'Khadija@1988', institutionDocName: 'WAKALA WA UWEZESHAJI WANANCHI KIUCHUM ZANZIBAR' },
  { name: 'shuwekha kassim awesu', username: 'shuwekhaawesu', email: 'shuwekha.awesu@zanajira.go.tz', phone: '0772845979', password: 'Tus@2026', institutionDocName: 'Tume ya Utumishi Serikalini' },
  { name: 'Miza Hussein Hassan', username: 'miza', email: 'miza.hussein@zfcc.go.tz', phone: '0773528954', password: 'Miza@1978', institutionDocName: 'Tume ya Ushindani Halali wa Biashara' },
  { name: 'CHAZI BWENI ZUBEIR', username: 'Nyaraka', email: 'chazi.zubeir@ziar.go.tz', phone: '0773338539', password: '123_Ziar', institutionDocName: 'Nyaraka' },
  { name: 'kombo yussuf kombo', username: 'kombo', email: 'kombokombo@wkuzanzibar.go.tz', phone: '0779441444', password: 'kombo@1977', institutionDocName: 'kamisheni ya kazi' },
  { name: 'NEMA RAMADHANI ALI', username: 'NEMA', email: 'nema.ali@zdcea.go.tz', phone: '0774127242', password: '2026@Pass', institutionDocName: 'MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR' },
  { name: 'Amina Peter Cosmas', username: 'Amina', email: 'Amina.peter@zanroads.go.tz', phone: '0777499433', password: 'Amina@123456', institutionDocName: 'Wakala wa barabara' },
  { name: 'Azida Makame Haji', username: 'azidahaji', email: 'azida.haji@zaeca.go.tz', phone: '0777134215', password: 'azida@2025', institutionDocName: 'MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU UCHUMI ZZANZIBAR' },
  // users29.md entries
  { name: 'Mohamed Sharif Mohamed', username: 'msmohamed', email: 'msmohamed@zanzibar.go.tz', phone: '0774537075', password: 'Unguja@2070', institutionDocName: 'wizara ya uvuvi' },
  { name: 'Hamza Haji Jecha', username: 'hjecha', email: 'hjecha@zanzibar.go.tz', phone: '0774537075', password: 'Unguja@2070', institutionDocName: 'MSAJILI WA HAZINA' },
  { name: 'harith abdala Fuad', username: 'hafuadi', email: 'fafuad@zanzibar.go.tz', phone: '0774537048', password: 'Unguja@2070', institutionDocName: 'wizara ya uvuvi' },
  { name: "Yunus Moh'd Khamis", username: 'yunusmod', email: 'yunus.khamis@zanzibarcity.go.tz', phone: '0777250071', password: 'Yunus@12345', institutionDocName: 'BARAZA LA JIJI LA ZANZIBAR' },
  { name: 'Fatma Ahmed omar', username: 'Fatma', email: 'fatma.omar@zanzibarcity.go.tz', phone: '0659178080', password: 'Fatma@12345', institutionDocName: 'Baraza la Jiji' },
  { name: 'khadija Yunus Mussa', username: 'Khayumu', email: 'khadija.mussa@zmc.go.tz', phone: '0774230840', password: 'Kha@12345', institutionDocName: 'BARAZA LA MANISPAA MJINI' },
  { name: 'Rehema Keis Khamis', username: 'Rehema', email: 'rehema.khamis@southunguja.go.tz', phone: '0777466060', password: 'rehema@12345', institutionDocName: 'OFISI YA MKUU WA WILAYA MJINI UNGUJA' },
  { name: 'Sharif Haji Khamis', username: 'sharifkhamis', email: 'sharif.khamis@bmkasmz.go.tz', phone: '0772060888', password: 'sharif@1989', institutionDocName: "BARAZA LA MANISPAA KASKAZINI 'A' UNGUJA" },
  { name: 'Maryam Abdulla Mussa', username: 'maryammussa', email: 'maryam.mussa@mjinimagharibi.go.tz', phone: '0658123079', password: 'Maryam@1234', institutionDocName: 'Afisi ya Mkuu wa Mkoa Mjini Magharibi' },
  { name: 'Ame Juma Khatib', username: 'mafunzo', email: 'ame.khatib@zpsc.go.tz', phone: '0681499025', password: 'kamisheni@2026', institutionDocName: 'kamisheni ya Utumishi wa Umma' },
  { name: 'HIDAYA ABDULLA SALEH', username: 'HIDAYA', email: 'hidaya.saleh@southunguja.go.tz', phone: '0777768958', password: 'Hidaya@8182', institutionDocName: 'MKOA KUSINI UNGUJA' },
  { name: 'KADH-YA KHAMIS JAHA', username: 'KADHYA_12345', email: 'kadhiya.jaha@blmmpsmz.go.tz', phone: '0777240909', password: 'Kadh-ya@123456', institutionDocName: 'WILAYA YA MAGHARIBI "B"' },
  { name: 'KOMBO ABDALLA KOMBO', username: 'KOMBO', email: 'kombo.kombo@mjinimagharibi.go.tz', phone: '0773305544', password: 'Utawala.1234', institutionDocName: 'AFISI YA MKUU WA MKOA MJINI MAGHARIBI' },
  { name: 'Mwanaidi Salum Mohamed', username: 'Mwanaidi', email: 'mwanaidi.salum@zanajira.go.tz', phone: '0772856136', password: 'Tus@12345', institutionDocName: 'TUME YA UTUMISHI SERIKALINI' },
  { name: 'Dawa Amour Hamad', username: 'Dawa', email: 'Dawa.hamad@magharibiadcsmz.go.tz', phone: '0773048640', password: 'Dawa@2011', institutionDocName: 'Wilaya ya MagharibiA' },
  { name: 'Mrisho Hassan Ali', username: 'Mrisho', email: 'mrisho.ali@kusini.go.tz', phone: '0772766002', password: 'Kusini@2026', institutionDocName: 'WILAYA YA KUSINI' },
  { name: 'salama khamis shaaban', username: 'salama', email: 'salama.shaaban@centraltc.go.tz', phone: '0778124648', password: 'salama@2026', institutionDocName: 'BARAZA LA MANISPAA KATI' },
  { name: 'Warda Haji Salim', username: 'warda', email: 'warda.salim@westbmc.go.tz', phone: '0776034567', password: 'warda@12345678', institutionDocName: 'BARAZA LA MANISPAA MAGHARIB "B"' },
  // users30.md entries
  { name: 'Mboja Hisabu Ali', username: 'Mboja', email: 'mboja.ali@mkoakaskaziniunguja.go.tz', phone: '0777453341', password: 'Mboja@12345', institutionDocName: 'Mkoa Kaskazini unguja' },
  { name: 'Khamis Shaha Ali', username: 'khamis', email: 'khamis.ali@northbtc.go.tz', phone: '0774208015', password: 'Khamis@0776', institutionDocName: 'Baraza la Mji Kaskazini "B" Unguja' },
  // users.md entries
  { name: 'Haji Ramadhan Haji', username: 'hrhaji', email: 'haji.haji@ethicscommission.go.tz', phone: '0778502525', password: 'Unguja@2016', institutionDocName: 'Tume ya Maadili ya viongozi wa Umma' },
  { name: 'Rashid Juma Jaku', username: 'Rashidjuma', email: 'rashid.jaku@mmh.go.tz', phone: '0776562120', password: 'Rashid@1987', institutionDocName: 'WIZARA YA AFYA' },
  { name: 'Fatma Abdulrahman Khatib', username: 'fatmakhatib', email: 'fatma.khatib@habarismz.go.tz', phone: '0777681054', password: 'Mwanaidi@2026', institutionDocName: 'Wizara ya Habari, Sanaa, Utamaduni na Michezo' },
  { name: 'kassim seif ally', username: 'kassimseif', email: 'kassim.ally@majismz.go.tz', phone: '0776727172', password: 'Ally@2023', institutionDocName: 'WIZARA YA MAJI NISHATI NA MADINI' },
  { name: 'Khadija Khamis Mussa', username: 'khadijakhamis', email: 'khadija.mussa@mofzanzibar.go.tz', phone: '0773195090', password: 'Khadija@2Mussa', institutionDocName: 'OFISI YA MHASIBU MKUU WA SERIKALI' },
  { name: 'Khamis Hamad Suleiman', username: 'khamissuleiman', email: 'khamis.hamad@moez.go.tz', phone: '0773962542', password: 'Kha@1111', institutionDocName: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI ZANZIBAR' },
  { name: 'Rashid Hamdu Makame', username: 'Rashid', email: 'rashid.makame@mohz.go.tz', phone: '0776545646', password: 'Rashid@2022', institutionDocName: 'WIZARA YA AFYA' },
  { name: 'SILIMA JUMA KHAMIS', username: 'silimakhamis', email: 'silima.khamis@tamisemim.go.tz', phone: '0773846339', password: 'Silima@2022', institutionDocName: 'OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUM ZA SMZ' },
  { name: 'ISSA SULEIMAN ALI', username: 'issasuleiman', email: 'issa.ali@blueeconomysmz.go.tz', phone: '0777423194', password: 'Issa@2022', institutionDocName: 'WIZARA YA UCHUMI WA BULUU NA UVUVI' },
  { name: 'Shadya Mwinyiusi Khatib', username: 'shadyamwinyiusi', email: 'Shadya.khatib@zec.go.tz', phone: '0776280020', password: 'Zec@1234', institutionDocName: 'TUME YA UCHAGUZI' },
  { name: 'Noah Saleh Said', username: 'noahsaid', email: 'noah.said@ardhismz.go.tz', phone: '0788750114', password: '02@Saleh', institutionDocName: 'WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI' },
  { name: 'JUMA ALI SIMAI', username: 'JUMA', email: 'juma.simai2@jamiismz.go.tz', phone: '0655005522', password: 'MZURIKAJA@8219', institutionDocName: 'WIZARA YA MAENDELEO YA JAMII, JINSIA, WAZEE NA WATOTO' },
  { name: 'Mtumwa Iddi Hamad', username: 'mtumwahamad', email: 'mtumwa.hamad@moic.go.tz', phone: '0773327070', password: 'Utumishi@march2026', institutionDocName: 'WIZARA YA UJENZI NA UCHUKUZI' },
  { name: 'Mahfoudh Mohammed Hassan', username: 'mahfoudhhassan', email: 'mahfoudh.hassan@kilimozanz.go.tz', phone: '0777455730', password: 'DAPwakilimo@2026', institutionDocName: 'Wizara Kilimo Umwagiliaji Maliasili na Mifugo' },
  { name: 'Ali Shaame Abdulla', username: 'aliabdulla', email: 'ali.abdulla@vijanasmz.go.tz', phone: '0777422705', password: 'Ali@2014', institutionDocName: 'WIZARA YA VIJANA AJIRA NA UWEZESHAJI' },
  { name: 'muhsin sufiani mkanga', username: 'muhsinmkanga', email: 'muhsin.mkanga@oiagsmz.go.tz', phone: '0777844254', password: 'Unguja@2026', institutionDocName: 'OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI' },
  { name: 'Leluu Abass Vuai', username: 'Leluu', email: 'leluu.vuai@matrektasmz.go.tz', phone: '0777121588', password: 'Zanzibar@01', institutionDocName: 'Wakala wa Serikali wa Huduma za Matrekta na Zana na Kilimo' },
  { name: 'Mwanamosi Ali Mwinchande', username: 'Mmwinchande', email: 'm.mwinchande@tradesmz.go.tz', phone: '0777146641', password: 'mwanamosi@12345', institutionDocName: 'wizara ya Biashara na Maendeleo ya Makaazi' },
  { name: 'YUSSUF MOHAMMED SULEIMAN', username: 'YUSSUFMOHAMMED', email: 'yussuf.mohd@utumishismz.go.tz', phone: '0778284861', password: 'utumishi@100', institutionDocName: 'OR- KATIBA,SHERIA, UTUMISHI NA UTAWALA BORA' },
  { name: 'Khadija Ali Hassan', username: 'khadijahassan', email: 'khadija.hassan@trosmz.go.tz', phone: '0773707002', password: 'Hassan@2020', institutionDocName: 'Ofisi ya Msajili wa Hazina' },
  { name: 'RAJAB UWEJE YAKOUB', username: 'UWEJE', email: 'rajab.uweje@mofzanzibar.go.tz', phone: '0773290940', password: 'rajab@1968', institutionDocName: 'WIZARA YA FEDHA NA MIPANGO' },
  { name: 'Rukia Jabir Haji', username: 'Rukia', email: 'rukia.haji@moez.go.tz', phone: '0776672391', password: 'Rukia@12345', institutionDocName: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI' },
  { name: 'Mariam Rished Mbarouk', username: 'Mariamrished', email: 'mariam.mbarouk@zpsc.go.tz', phone: '0777430526', password: 'Mariam@7619', institutionDocName: 'KAMISHENI YA UTUMISHI WA UMMA' },
  { name: 'khalid Haruna Ussi', username: 'khalidussi', email: 'khalid.ussi2@ocie.go.tz', phone: '0777244360', password: 'Khalid@1234', institutionDocName: 'OFISI YA MKAGUZI MKUU WA ELIMU' },
  { name: 'Rajab Ali Ramadhan', username: 'rajabaliramadhan', email: 'rajab.ramadhan@ikulu.go.tz', phone: '0777458463', password: 'Unguja@2026', institutionDocName: 'OFISI YA RAISI IKULU' },
  { name: 'Maryam uki', username: 'Maryamuki', email: 'Maryam.uki@planningznz.go.tz', phone: '0772485985', password: 'Maryam@2026', institutionDocName: 'Tume ya mipango Zanzibar' },
  { name: 'Omari Karume Juma', username: 'omarikarume', email: 'omari.juma@ziar.go.tz', phone: '0774769126', password: 'Omari@1234', institutionDocName: 'Taasisi ya anyaraka na kumbukumbu' },
  { name: 'Salum Mohammed Ahmed', username: 'DrSalum', email: 'salum.ahmed@wakf.go.tz', phone: '0777430911', password: 'Salum@123', institutionDocName: 'Kamisheni ya Wakfu na Mali ya Amana' },
  { name: 'Rukia Jabir Haji', username: 'RukiaJ', email: 'rukia.haji2@moez.go.tz', phone: '0776672391', password: 'Rukia@12345', institutionDocName: 'OFISI YA MRAJISI WA ELIMU ZANZIBAR' },
  { name: 'Mohamed Jaffar Jumanne', username: 'MohamedJaffar', email: 'mohamed.jumanne@omkr.go.tz', phone: '0777233383', password: 'Ngarambe@1973', institutionDocName: 'ofisi ya makamo wa kwanza wa Rais' },
  { name: "OTHAMN MOH'D SALEH", username: 'Othamnmohdsaleh', email: 'othman.saleh@muftizanzibar.go.tz', phone: '0777471038', password: 'othman@2026', institutionDocName: 'OFISI YA MUFTI MKUU ZANZIBAR' },
  { name: 'Rukia Jabir Haji', username: 'RukiaJabir', email: 'rukia.haji3@moez.go.tz', phone: '0776672391', password: 'Rukia@12345', institutionDocName: 'OFISI YA BARAZA LA ELIMU NA MRAJIS WA ELIMU' },
  // users.md (mafunzo) entries
  { name: 'MUSSA HASSAN ZYUMA', username: 'ZYUMA', email: 'mussa.zyuma@zie.go.tz', phone: '0774428753', password: 'Binzyuma@1982', institutionDocName: 'TAASISI YA ELIMU YA ZANZIBAR' },
  { name: 'Mwadiji Juma Ame', username: 'MwadiniJumaAme', email: 'mwadini.ame@bmz.go.tz', phone: '0778198478', password: 'mwadinij@2026', institutionDocName: 'BARAZA LA MITIHANI ZANZIABAR' },
  { name: 'Haji Ame Haji', username: 'hajihaji', email: 'haji.haji@maafaznz.go.tz', phone: '0773304409', password: 'tume@01yautumishi', institutionDocName: 'KAMISHENI YA KUKABILIANA NA MAAFA' },
  { name: 'Saleh Ussi Mwadini', username: 'ussi', email: 'saleh.mwadini@zfcc.go.tz', phone: '0772163435', password: 'Saleh@1974', institutionDocName: 'TUME YA USHINDANI HALALI WA BIASHARA' },
  { name: 'Zaituni Amour Abdulla', username: 'zaituniabdulla', email: 'zaituni.abdulla@cosozasmz.go.tz', phone: '0776711451', password: 'Cosoza@2026', institutionDocName: 'AFISI YA MSAJILI WA HAKIMIIKI - COSOZA' },
  { name: 'TWALIB SHEHA KHAMIS', username: 'Twalib_88', email: 'twalib.khamis@matrektasmz.go.tz', phone: '0777838689', password: 'Twalib@12345', institutionDocName: 'wakala wa huduma za matrekta' },
  { name: 'Zuhura Abdulla Salim', username: 'zuhura2', email: 'zuhura.salim2@zba.go.tz', phone: '0777439768', password: '@Ummukulthum2', institutionDocName: 'WAKALA WA MAJENGO' },
  { name: 'Khamisuu Hamid Mohd', username: 'KhamisuuMhohd', email: 'khamisuu.mohd@wkuzanzibar.go.tz', phone: '0777481919', password: 'Tumaabuu@123', institutionDocName: 'WIZARA YA KAZI' },
  { name: 'Khamis Ali Foum', username: 'Khamisfoum', email: 'khamis.fum@zanroads.go.tz', phone: '0777484348', password: 'Foum@123456', institutionDocName: 'Wakala wa Barabara' },
  { name: 'ameirhaji', username: 'ameirhaji', email: 'ameir.haji@westbmc.go.tz', phone: '0777861725', password: 'westa@2026', institutionDocName: 'WILAYA YA MAGHARIBI A' },
  { name: 'Mtumwa Ame Haji', username: 'Mtumwa', email: 'mtumwa.haji@zartsa.go.tz', phone: '0777765976', password: 'Barabara@2026', institutionDocName: 'MAMLAKA YA USAFIRI NA USALAMA BARABARANI' },
  { name: 'Khamis Ali Jaku', username: 'khamisjaku', email: 'khamis.jaku@kamisheniardhi.go.tz', phone: '0777474194', password: 'Unguja@2016', institutionDocName: 'KAMISHENI YA ARDHI' },
  { name: 'Hassan Abdalla Rashid', username: 'hassa', email: 'hassan.rashid@kaskazinibdcsmzdcsmz.go.tz', phone: '0777150012', password: 'Hassan@12345', institutionDocName: 'Wilaya ya Kaskazini B' },
  { name: 'ASHA KASSIM HAJI', username: 'asha', email: 'asha.haji@ccksmz.go.tz', phone: '0773486839', password: 'Asha@1974', institutionDocName: 'WIZARA YA ELIMU' },
  { name: 'Abdallah Juma Abdallah', username: 'Dullahj344', email: 'abdallah.abdallah@bmkasmz.go.tz', phone: '0777416494', password: 'Get@12345', institutionDocName: "BARAZA LA MANISPAA KASKAZINI 'A' UNGUJA" },
  { name: 'Sabra Juma Hassan', username: 'sabra', email: 'sabra.hassan@ompr.go.tz', phone: '0778851920', password: 'Sabra@2026', institutionDocName: 'OFISI YA MAKAMU WA PILI WA RAIS' },
  { name: 'Tatu Mohamed Naim', username: 'tatu', email: 'tatu.naim2@zafiri.go.tz', phone: '0773151745', password: 'Tatu@1234', institutionDocName: 'Taasisi ya Utafiti wa Uvuvi na Maliasili za Baharini Zanzibar' },
  { name: 'Mshenga Machano Ali', username: 'Mshenga12345', email: 'mshenga.ali@zls.go.tz', phone: '0777506856', password: 'Mshenga@2024', institutionDocName: 'Bodi ya Huduma za Maktaba Zanzibar' },
  { name: 'Adam Sio Suleiman', username: 'Adam', email: 'adam.suleiman@zaeca.go.tz', phone: '0773564045', password: 'Mannahil@8', institutionDocName: 'ZAECA' },
  { name: 'Fatma Mohamed Khamis', username: 'fatmakhamis', email: 'fatmakhamis@central.go.tz', phone: '0773168121', password: 'fatma@2026', institutionDocName: 'BARAZA LA MANISPA MAGHARIBI A' },
  { name: 'Ashraf Mohammes Abdalla', username: 'ashrafabdalla', email: 'ashraf.abdalla@egaz.go.tz', phone: '0777043737', password: 'Forodhani@1', institutionDocName: 'Mamlaka ya Serikali Mtandao Zanzibar' },
  { name: 'Hassan Hussein Hassan', username: 'Hassan', email: 'hassan.hassan@zanajira.go.tz', phone: '0777105226', password: 'Kilo@2026', institutionDocName: 'Tume ya Utumishi Serikalini' },
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
          role: 'HRRP',
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
          role: 'HRRP',
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