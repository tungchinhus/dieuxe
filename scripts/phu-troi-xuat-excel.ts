// Xếp xe theo quy luật đã học từ các PDF và xuất Excel, đọc thẳng các file đăng ký phụ trội của phòng ban (không cần app).
//   node scripts/phu-troi-xuat-excel.mjs <thư mục excel> [--xe 16,16,29] [--out file.xlsx]
// --xe: loại xe theo thứ tự trên phiếu (16 = 16 chỗ chở 15, 29 = 29 chỗ chở 28, 45 = 45 chỗ chở 44).
//   Không ghi thì như app: 4 xe 16 chỗ, xe không cần thì bỏ. Thiếu xe thì phần còn lại đi taxi.
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { IMPORT_COLUMNS, isPersonName, normalizePhone, parseEndTime, parseTime } from '../src/app/services/excel-import-sanitize';
import { PhuTroiVehiclePackingService, passengerCapacityOf, taxiSeatsOf } from '../src/app/services/phu-troi-vehicle-packing.service';
import { PhuTroiVehicleRouteSortService } from '../src/app/services/phu-troi-vehicle-route-sort.service';

interface Row {
  hoTen: string;
  tramXe: string;
  dienThoai: string;
  tu: string;
  den: string;
  file: string;
}

const args = process.argv.slice(2);
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const dir = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!dir) {
  console.error('Cách dùng: node scripts/phu-troi-xuat-excel.mjs <thư mục excel> [--xe 16,16,29] [--out file.xlsx]');
  process.exit(1);
}

const sort = new PhuTroiVehicleRouteSortService();
const packing = new PhuTroiVehiclePackingService(sort);
const cell = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Đọc sheet đầu của mỗi file: chỉ lấy dòng có STT là số và tên là tên người (bỏ dòng tổ, chữ ký, mẫu cũ). */
function readFile(file: string): { rows: Row[]; date: string | null } {
  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
  let date: string | null = null;
  const rows: Row[] = [];
  for (const r of data) {
    const text = r.map(cell).join(' ');
    const m = text.match(/ng[àa]y\s*(\d{1,2})\s*(?:\/|th[áa]ng)\s*(\d{1,2})\s*(?:\/|n[ăa]m)\s*(\d{4})/i);
    if (m && !date) date = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
    const stt = cell(r[IMPORT_COLUMNS.stt]);
    const hoTen = cell(r[IMPORT_COLUMNS.hoTen]);
    if (!/^\d+$/.test(stt) || !isPersonName(hoTen)) continue;
    rows.push({
      hoTen,
      tramXe: cell(r[IMPORT_COLUMNS.tramXe]),
      dienThoai: normalizePhone(r[IMPORT_COLUMNS.dienThoai] as string),
      tu: parseTime(cell(r[IMPORT_COLUMNS.tu])) || '15:45',
      den: parseEndTime(cell(r[IMPORT_COLUMNS.den])) || '19:00',
      file: path.basename(file),
    });
  }
  return { rows, date };
}

const files = fs.readdirSync(dir).filter(f => /\.xlsx?$/i.test(f) && !f.startsWith('~$')).map(f => path.join(dir, f));
const all: Row[] = [];
const dates = new Map<string, number>();
const seen = new Set<string>();
for (const file of files) {
  const { rows, date } = readFile(file);
  if (date) dates.set(date, (dates.get(date) || 0) + 1);
  for (const row of rows) {
    const key = sort.fold(row.hoTen);
    if (seen.has(key)) continue; // cùng người đăng ký ở hai phòng: lấy một lần
    seen.add(key);
    all.push(row);
  }
  console.log(`  ${path.basename(file)}: ${rows.length} người`);
}
// Ngày đăng ký: ngày xuất hiện nhiều nhất trong các phiếu (phiếu cũ để quên ngày sai không ảnh hưởng).
const day = [...dates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || new Date().toLocaleDateString('vi-VN');

const fleetSpec = opt('--xe');
const fleet = fleetSpec
  ? fleetSpec.split(',').map((t, i) => ({ plate: `${t.trim()}C - (chưa gán xe)`, capacity: passengerCapacityOf(`${t.trim()} chỗ`, ''), routes: [`XE ${i + 1}`] }))
  : [1, 2, 3, 4].map(i => ({ plate: '16C - (chưa gán xe)', capacity: 15, routes: [`XE ${i}`], optional: true }));
const loads = packing.planForFleet(all, fleet);
const selfRegs = sort.sortRegistrations(all.filter(r => packing.isSelfCommute(r)));

// Cùng bố cục với phiếu app xuất (excel-export.service.ts, khi xếp thẳng vào xe).
const data: (string | number)[][] = [
  ['PHIẾU BÁO LÀM THÊM GIỜ'],
  [`Ngày ${day}`],
  ['STT', 'Họ và tên', 'Trạm xe', 'Điện thoại', '', 'Từ...', 'Đến...'],
];
const writeBlock = (regs: Row[], header: string) => {
  regs.forEach((r, i) => data.push([i + 1, r.hoTen, r.tramXe, r.dienThoai, '', r.tu, r.den]));
  data.push([header, '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '']);
};
for (const load of loads) {
  const header = load.isTaxi
    ? `TUYẾN: TAXI | Xe: TAXI ${taxiSeatsOf(load.registrations.length)} chỗ`
    : `TUYẾN: ${load.routeLabel} | Tài xế: | SĐT: | Xe: ${load.plateDisplay}`;
  writeBlock(load.registrations, header);
}
if (selfRegs.length) writeBlock(selfRegs, 'TUYẾN: TỰ TÚC');

const ws = XLSX.utils.aoa_to_sheet(data);
ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 36 }, { wch: 13 }, { wch: 4 }, { wch: 8 }, { wch: 8 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Phụ trội');
const [d, m, y] = day.split('/');
const out = opt('--out') || path.join(dir, `PHU TROI XEP XE ${d}.${m}.${y}.xlsx`);
XLSX.writeFile(wb, out);

console.log(`Ngày ${day}: ${all.length} người đăng ký, ${all.length - selfRegs.length} đi xe, ${selfRegs.length} tự túc`);
loads.forEach(l => console.log(`  ${l.isTaxi ? 'TAXI' : l.routeLabel} (${l.plateDisplay}): ${l.registrations.length} người`));
console.log(`Ghi ${out}`);
