const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../public/data/ข้อมูลจังหวัด และสถานะใบอนุญาต.csv');
const outputPath = path.join(__dirname, '../public/data/pharmacist-stats.json');

const provinceMapping = {
  "Bangkok Metropolis": "กรุงเทพมหานคร",
  "Amnat Charoen": "อำนาจเจริญ",
  "Ang Thong": "อ่างทอง",
  "Bueng Kan": "บึงกาฬ",
  "Buri Ram": "บุรีรัมย์",
  "Chachoengsao": "ฉะเชิงเทรา",
  "Chai Nat": "ชัยนาท",
  "Chaiyaphum": "ชัยภูมิ",
  "Chanthaburi": "จันทบุรี",
  "Chiang Mai": "เชียงใหม่",
  "Chiang Rai": "เชียงราย",
  "Chon Buri": "ชลบุรี",
  "Chumphon": "ชุมพร",
  "Kalasin": "กาฬสินธุ์",
  "Kamphaeng Phet": "กำแพงเพชร",
  "Kanchanaburi": "กาญจนบุรี",
  "Khon Kaen": "ขอนแก่น",
  "Krabi": "กระบี่",
  "Lampang": "ลำปาง",
  "Lamphun": "ลำพูน",
  "Loei": "เลย",
  "Lop Buri": "ลพบุรี",
  "Mae Hong Son": "แม่ฮ่องสอน",
  "Maha Sarakham": "มหาสารคาม",
  "Mukdahan": "มุกดาหาร",
  "Nakhon Nayok": "นครนายก",
  "Nakhon Pathom": "นครปฐม",
  "Nakhon Phanom": "นครพนม",
  "Nakhon Ratchasima": "นครราชสีมา",
  "Nakhon Sawan": "นครสวรรค์",
  "Nakhon Si Thammarat": "นครศรีธรรมราช",
  "Nan": "น่าน",
  "Narathiwat": "นราธิวาส",
  "Nong Bua Lam Phu": "หนองบัวลำภู",
  "Nong Khai": "หนองคาย",
  "Nonthaburi": "นนทบุรี",
  "Pathum Thani": "ปทุมธานี",
  "Pattani": "ปัตตานี",
  "Phangnga": "พังงา",
  "Phatthalung": "พัทลุง",
  "Phayao": "พะเยา",
  "Phetchabun": "เพชรบูรณ์",
  "Phetchaburi": "เพชรบุรี",
  "Phichit": "พิจิตร",
  "Phitsanulok": "พิษณุโลก",
  "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา",
  "Phrae": "แพร่",
  "Phuket": "ภูเก็ต",
  "Prachin Buri": "ปราจีนบุรี",
  "Prachuap Khiri Khan": "ประจวบคีรีขันธ์",
  "Ranong": "ระนอง",
  "Ratchaburi": "ราชบุรี",
  "Rayong": "ระยอง",
  "Roi Et": "ร้อยเอ็ด",
  "Sa Kaeo": "สระแก้ว",
  "Sakon Nakhon": "สกลนคร",
  "Samut Prakan": "สมุทรปราการ",
  "Samut Sakhon": "สมุทรสาคร",
  "Samut Songkhram": "สมุทรสงคราม",
  "Saraburi": "สระบุรี",
  "Satun": "สตูล",
  "Si Sa Ket": "ศรีสะเกษ",
  "Sing Buri": "สิงห์บุรี",
  "Songkhla": "สงขลา",
  "Sukhothai": "สุโขทัย",
  "Suphan Buri": "สุพรรณบุรี",
  "Surat Thani": "สุราษฎร์ธานี",
  "Surin": "สุรินทร์",
  "Tak": "ตาก",
  "Trang": "ตรัง",
  "Trat": "ตราด",
  "Ubon Ratchathani": "อุบลราชธานี",
  "Udon Thani": "อุดรธานี",
  "Uthai Thani": "อุทัยธานี",
  "Uttaradit": "อุตรดิตถ์",
  "Yala": "ยะลา",
  "Yasothon": "ยโสธร"
};

// Reverse mapping: Thai -> English ID
const reverseMapping = {};
for (const [en, th] of Object.entries(provinceMapping)) {
  reverseMapping[th] = en;
}

function processCSV() {
  console.log('Reading CSV file...');
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n');
  
  // Header: ลำดับ,จังหวัดภูมิลำเนา,จังหวัดสถานที่ติดต่อได้,จังหวัดสถานที่ทำงาน,สถานะใบอนุญาต
  const counts = {};

  // Initialize all provinces with 0
  for (const en of Object.keys(provinceMapping)) {
    counts[en] = 0;
  }

  let skippedRows = 0;
  let processedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    if (cols.length < 5) continue;

    const contactProvince = cols[2]?.trim();
    const workProvince = cols[3]?.trim();
    const status = cols[4]?.trim();

    // 1. Filter: Status must be "ปกติ"
    if (status !== 'ปกติ') {
      skippedRows++;
      continue;
    }

    // 2. Select province: Work Province first, then Contact Province
    let selectedThaiName = workProvince || contactProvince;
    
    if (!selectedThaiName) {
      skippedRows++;
      continue;
    }

    // Handle "จังหวัด" prefix if it exists (though usually not in these exports)
    selectedThaiName = selectedThaiName.replace(/^จังหวัด/, '');

    const englishId = reverseMapping[selectedThaiName];

    if (englishId) {
      counts[englishId]++;
      processedRows++;
    } else {
      // console.warn(`Province not found in mapping: ${selectedThaiName}`);
      skippedRows++;
    }
  }

  const result = Object.entries(counts).map(([id, count]) => ({
    id,
    name: provinceMapping[id],
    count
  }));

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Processing complete!`);
  console.log(`Processed: ${processedRows} rows`);
  console.log(`Skipped: ${skippedRows} rows`);
  console.log(`Results saved to ${outputPath}`);
}

processCSV();
