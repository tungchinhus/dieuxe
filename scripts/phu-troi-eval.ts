// Đo tỉ lệ khớp giữa code xếp xe và các PDF xếp tay (PDF là gốc), không cần Karma/trình duyệt.
//   node scripts/phu-troi-eval.mjs [parsed.json ...] [--json out.json]
// Mặc định đo mọi fixture trong src/app/services/testdata; thêm file JSON do phu-troi-pdf-parse.py sinh ra để đo PDF mới.
// Chạy qua scripts/phu-troi-eval.mjs (tự đóng gói file này bằng esbuild).
import * as fs from 'fs';
import { PhuTroiVehiclePackingService } from '../src/app/services/phu-troi-vehicle-packing.service';
import { PhuTroiVehicleRouteSortService } from '../src/app/services/phu-troi-vehicle-route-sort.service';
import { PHU_TROI_PDF_FIXTURES, PhuTroiPdfFixture } from '../src/app/services/testdata';

interface ParsedPdf {
  date: string | null;
  source?: string;
  vehicles: { label: string; capacity: number; rows: { hoTen: string; tramXe: string }[] }[];
}

export interface DayResult {
  date: string;
  source: string;
  people: number;
  matched: number;
  agreement: number;
  /** Số xe đúng hoàn toàn (đúng người, đúng thứ tự trạm) khi ghép xe theo thứ tự phiếu. */
  exactVehicles: number;
  vehicles: number;
  ours: string;
  pdf: string;
  mismatches: string[];
}

const sort = new PhuTroiVehicleRouteSortService();
const packing = new PhuTroiVehiclePackingService(sort);

function fromParsed(p: ParsedPdf): PhuTroiPdfFixture {
  return {
    date: p.date || p.source || '?',
    employees: p.vehicles.flatMap(v => v.rows),
    vehicles: p.vehicles.map(v => ({ label: v.label, capacity: v.capacity, names: v.rows.map(r => r.hoTen) })),
  };
}

/** Ghép xe của mình với xe trong PDF sao cho trùng nhiều người nhất (hai xe cùng cụm có thể đổi vai). */
function bestMatching(mine: string[][], pdf: string[][]): { total: number; pairs: number[] } {
  const n = Math.max(mine.length, pdf.length);
  const overlap = (a: string[] = [], b: string[] = []) => a.filter(name => b.includes(name)).length;
  const used = new Array(n).fill(false);
  const pairs = new Array(n).fill(-1);
  let best = { total: -1, pairs: [] as number[] };
  const search = (i: number, acc: number) => {
    if (i === n) {
      if (acc > best.total) best = { total: acc, pairs: pairs.slice() };
      return;
    }
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      used[j] = true;
      pairs[i] = j;
      search(i + 1, acc + overlap(mine[i], pdf[j]));
      used[j] = false;
    }
  };
  search(0, 0);
  return best;
}

export function evaluate(fixture: PhuTroiPdfFixture, source = 'fixture'): DayResult {
  const loads = packing.planForFleet(
    fixture.employees,
    fixture.vehicles.map((v, i) => ({ plate: `Xe ${i + 1}`, capacity: v.capacity }))
  );
  const mine = loads.map(l => l.registrations.map(r => r.hoTen!));
  const pdf = fixture.vehicles.map(v => v.names);
  const people = pdf.reduce((n, names) => n + names.length, 0);
  const { total, pairs } = bestMatching(mine, pdf);
  const stationOf = new Map(fixture.employees.map(e => [e.hoTen, e.tramXe]));
  const seq = (names: string[]) =>
    names.map(n => sort.fold(stationOf.get(n) || '')).filter((s, i, a) => i === 0 || a[i - 1] !== s).join('>');
  let exactVehicles = 0;
  const mismatches: string[] = [];
  pdf.forEach((names, j) => {
    const i = pairs.indexOf(j);
    const ours = mine[i] || [];
    const missing = names.filter(n => !ours.includes(n));
    const extra = ours.filter(n => !names.includes(n));
    if (!missing.length && !extra.length && seq(ours) === seq(names)) exactVehicles++;
    if (missing.length) mismatches.push(`xe PDF ${j + 1} (${fixture.vehicles[j].label}) thiếu: ${missing.map(n => `${n} [${stationOf.get(n)}]`).join(', ')}`);
    if (extra.length) mismatches.push(`xe PDF ${j + 1} (${fixture.vehicles[j].label}) thừa: ${extra.map(n => `${n} [${stationOf.get(n)}]`).join(', ')}`);
  });
  return {
    date: fixture.date,
    source,
    people,
    matched: total,
    agreement: people ? total / people : 1,
    exactVehicles,
    vehicles: pdf.length,
    ours: mine.map(m => m.length).join('/'),
    pdf: pdf.map(n => n.length).join('/'),
    mismatches,
  };
}

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const inputs = args.filter((a, i) => a !== '--json' && args[i - 1] !== '--json');
const known = new Set(PHU_TROI_PDF_FIXTURES.map(f => f.date));
const results: DayResult[] = PHU_TROI_PDF_FIXTURES.map(f => evaluate(f));
for (const file of inputs) {
  const parsed: ParsedPdf = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fixture = fromParsed(parsed);
  if (known.has(fixture.date)) continue; // đã có fixture (fixture là bản đã kiểm, ưu tiên) hoặc đã đo ngày này
  known.add(fixture.date);
  results.push(evaluate(fixture, parsed.source || file));
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
for (const r of results) {
  console.log(`${r.date.padEnd(11)} ${pct(r.agreement).padStart(6)}  ${String(r.matched).padStart(3)}/${String(r.people).padEnd(3)} xe đúng hẳn ${r.exactVehicles}/${r.vehicles}  (mình ${r.ours} | PDF ${r.pdf})${r.source === 'fixture' ? '' : '  [PDF mới]'}`);
  for (const m of r.mismatches) console.log(`             - ${m}`);
}
const people = results.reduce((n, r) => n + r.people, 0);
const matched = results.reduce((n, r) => n + r.matched, 0);
console.log(`TỔNG ${results.length} ngày: ${pct(matched / people)} người lên đúng xe (${matched}/${people}); ngày khớp 100%: ${results.filter(r => r.matched === r.people).length}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
