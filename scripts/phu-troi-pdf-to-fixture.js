// Tạo fixture đối chiếu từ "DS PHỤ TRỘI dd.mm.pdf" (kết quả đúng) + danh sách nhân viên ngày đó.
//   node scripts/phu-troi-pdf-to-fixture.js <pdf> <employees.json> <yyyymmdd>
// employees.json: [{ "hoTen": "...", "tramXe": "..." }, ...] (xuất từ Excel nhập hoặc từ app).
// PDF gộp ô trạm nên không đọc được trạm từng người; chỉ lấy tên người theo từng xe (mỗi "TUYẾN:" là một xe).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [pdf, employeesFile, ymd] = process.argv.slice(2);
if (!pdf || !employeesFile || !/^\d{8}$/.test(ymd || '')) {
  console.error('Cách dùng: node scripts/phu-troi-pdf-to-fixture.js <pdf> <employees.json> <yyyymmdd>');
  process.exit(1);
}
const fold = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));
const text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });

const byFold = new Map(employees.map(e => [fold(e.hoTen), e.hoTen]));
const vehicles = [];
const unmatched = [];
for (const line of text.split(/\r?\n/)) {
  if (/TUYẾN:/.test(line)) {
    vehicles.push({ label: line.replace(/\s+/g, ' ').replace(/\s*\d\d:\d\d\s*$/, '').trim(), capacity: 15, names: [] });
    continue;
  }
  const m = line.match(/^\s*(\d+)\s+(.+)$/);
  if (!m || !vehicles.length) continue;
  const rest = fold(m[2]);
  // tên dài nhất là tiền tố của phần còn lại của dòng
  let best = '';
  for (const [key, name] of byFold) if (rest.startsWith(key) && key.length > fold(best).length) best = name;
  if (best) vehicles[vehicles.length - 1].names.push(best);
  else unmatched.push(line.trim());
}
const listed = new Set(vehicles.flatMap(v => v.names));
const notInPdf = employees.filter(e => !listed.has(e.hoTen)).map(e => `${e.hoTen} (${e.tramXe})`);

const out = path.join(__dirname, '..', 'src', 'app', 'services', 'testdata', `phu-troi-${ymd}.fixture.ts`);
fs.writeFileSync(
  out,
  `// Tự sinh bởi scripts/phu-troi-pdf-to-fixture.js từ "${path.basename(pdf)}" (kết quả đúng làm gốc).\n` +
    `export const PT_${ymd}_EMPLOYEES: { hoTen: string; tramXe: string }[] = ${JSON.stringify(employees, null, 2)};\n\n` +
    `export const PT_${ymd}_PDF_VEHICLES: { label: string; capacity: number; names: string[] }[] = ${JSON.stringify(vehicles, null, 2)};\n`
);
console.log(`Ghi ${out}`);
vehicles.forEach((v, i) => console.log(`  xe ${i + 1}: ${v.names.length} người — ${v.label}`));
console.log(`Không có trong PDF (tự túc / không đi xe): ${notInPdf.length}`);
notInPdf.forEach(n => console.log('   -', n));
if (unmatched.length) { console.log('Dòng PDF không khớp tên nào:'); unmatched.forEach(l => console.log('   ?', l)); }
console.log(`Nhớ đăng ký fixture trong src/app/services/testdata/index.ts`);
