// Kiểm tra hằng ngày: đọc mọi "DS PHỤ TRỘI *.pdf" trong thư mục nhận PDF mới (M:\P. TC-HC\AI TC-HC\AI-sapxe, đổi bằng
// biến môi trường PHU_TROI_PDF_DIRS, nhiều thư mục cách nhau bởi ";"); các ngày đã có fixture trong testdata vẫn được đo lại, đo tỉ lệ khớp của code xếp xe với từng PDF,
// ghi báo cáo exports/phu-troi-reports/<yyyy-mm-dd>.md và đánh dấu PDF mới (chưa thấy ở lần chạy trước).
//   node scripts/phu-troi-daily.mjs
// Cần: python + pdfplumber (python -m pip install --user pdfplumber).
import { execFileSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'exports', 'phu-troi-reports');
const parsedDir = join(outDir, 'parsed');
const statePath = join(outDir, 'state.json');
mkdirSync(parsedDir, { recursive: true });

const inboxDirs = (process.env.PHU_TROI_PDF_DIRS || 'M:\\P. TC-HC\\AI TC-HC\\AI-sapxe').split(';').filter(Boolean);
const missingDirs = inboxDirs.filter(dir => !existsSync(dir));
const folders = inboxDirs.filter(dir => existsSync(dir));
// Cùng một file (tên + dung lượng) có ở nhiều thư mục thì chỉ đọc một lần.
const pdfByKey = new Map();
for (const dir of folders) {
  for (const f of readdirSync(dir).filter(name => /^DS PH.*\.pdf$/i.test(name))) {
    const key = `${f.normalize('NFC')}|${statSync(join(dir, f)).size}`;
    if (!pdfByKey.has(key)) pdfByKey.set(key, join(dir, f));
  }
}
const pdfs = [...pdfByKey.values()];
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { seen: {} };

const parsedFiles = [];
const newPdfs = [];
const errors = [];
for (const pdf of pdfs) {
  const key = `${basename(pdf).normalize('NFC')}|${statSync(pdf).size}`;
  const out = join(parsedDir, basename(pdf).replace(/\.pdf$/i, '.json'));
  try {
    if (!existsSync(out) || !state.seen[key]) {
      execFileSync('python', [join(root, 'scripts', 'phu-troi-pdf-parse.py'), pdf, out], { stdio: 'pipe' });
      const parsed = JSON.parse(readFileSync(out, 'utf8'));
      // Ngày lấy từ tiêu đề phiếu; không có thì từ tên file "DS PHỤ TRỘI dd.mm.pdf" (năm hiện tại).
      if (!parsed.date) {
        const m = basename(pdf).match(/(\d{1,2})[.\-](\d{1,2})(?:[.\-](\d{2,4}))?/);
        if (m) parsed.date = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : new Date().getFullYear()}`;
      }
      parsed.source = basename(pdf);
      writeFileSync(out, JSON.stringify(parsed, null, 2));
      if (!state.seen[key]) newPdfs.push(basename(pdf));
      state.seen[key] = pdf;
    }
    parsedFiles.push(out);
  } catch (e) {
    errors.push(`${basename(pdf)}: không đọc được (${String(e.message || e).split('\n')[0]})`);
  }
}

const jsonOut = join(outDir, 'last-eval.json');
const run = spawnSync(process.execPath, [join(root, 'scripts', 'phu-troi-eval.mjs'), ...parsedFiles, '--json', jsonOut], {
  encoding: 'utf8',
  maxBuffer: 1 << 26,
});
if (run.status !== 0) {
  console.error(run.stdout, run.stderr);
  process.exit(1);
}
const results = JSON.parse(readFileSync(jsonOut, 'utf8'));
const pct = x => `${(x * 100).toFixed(1)}%`;
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const people = results.reduce((n, r) => n + r.people, 0);
const matched = results.reduce((n, r) => n + r.matched, 0);
const lines = [
  `# Đối chiếu xếp xe phụ trội — ${today}`,
  '',
  `PDF mới từ lần chạy trước: ${newPdfs.length ? newPdfs.join(', ') : 'không có'}`,
  ...errors.map(e => `- LỖI: ${e}`),
  ...missingDirs.map(dir => `- LỖI: không mở được thư mục ${dir} (ổ mạng chưa kết nối?)`),
  '',
  `Tổng ${results.length} ngày: **${pct(matched / people)}** người lên đúng xe (${matched}/${people}); ngày khớp 100%: ${results.filter(r => r.matched === r.people).length}.`,
  '',
  '| Ngày | Nguồn | Khớp | Người | Xe đúng hẳn | Số người từng xe (code / PDF) |',
  '|---|---|---|---|---|---|',
  ...results.map(r => `| ${r.date} | ${r.source === 'fixture' ? 'fixture' : r.source} | ${pct(r.agreement)} | ${r.matched}/${r.people} | ${r.exactVehicles}/${r.vehicles} | ${r.ours} / ${r.pdf} |`),
  '',
  '## Chỗ lệch',
  ...results.filter(r => r.mismatches.length).flatMap(r => [`### ${r.date}`, ...r.mismatches.map(m => `- ${m}`)]),
  '',
];
const report = join(outDir, `${today}.md`);
writeFileSync(report, lines.join('\n'));
writeFileSync(statePath, JSON.stringify(state, null, 2));
console.log(run.stdout);
missingDirs.forEach(dir => console.log(`LỖI: không mở được thư mục ${dir}`));
console.log(`PDF mới: ${newPdfs.join(', ') || 'không có'}`);
console.log(`Báo cáo: ${report}`);
