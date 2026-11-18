/**
 * Làm sạch dữ liệu giờ / số điện thoại khi nhập Excel và khi xuất phiếu.
 * File nhập của các phòng ban không cùng bố cục (có file thêm cột mã NV, SĐT lưu dạng số mất số 0 đầu,
 * ô giờ ghi "15h45" hoặc ghi chú), nên không được suy giờ từ một chuỗi bất kỳ.
 */

/** Trả "HH:mm" hợp lệ (00:00–23:59) hoặc chuỗi rỗng nếu không đọc được giờ. */
export function parseTime(text: string | undefined | null): string {
  const value = String(text ?? '').trim();
  if (!value) return '';

  const pattern =
    value.match(/(\d{1,2})\s*[h:]\s*(\d{2})/i) ||
    value.match(/^(\d{1,2})\s*h?$/i) ||
    value.match(/^(\d{2})(\d{2})$/);
  if (!pattern) return '';

  const hours = Number(pattern[1]);
  const minutes = pattern[2] === undefined ? 0 : Number(pattern[2]);
  if (hours > 23 || minutes > 59) return '';
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Chuẩn hóa số điện thoại Việt Nam: bỏ khoảng trắng/dấu chấm, thêm số 0 đầu bị mất; không phải số điện thoại thì trả rỗng. */
export function normalizePhone(value: string | number | undefined | null): string {
  const compact = String(value ?? '').replace(/[\s.\-()]/g, '');
  if (!compact) return '';
  if (/^\+?84\d{9,10}$/.test(compact)) return '0' + compact.replace(/^\+?84/, '');
  if (/^0\d{9,10}$/.test(compact)) return compact;
  if (/^[1-9]\d{8}$/.test(compact)) return '0' + compact; // 934178545 → 0934178545 (Excel làm mất số 0)
  return '';
}

/** Lấy số điện thoại đầu tiên tìm được trong một chuỗi có lẫn chữ (vd. "0908111034 - ca đêm"). */
export function findPhoneIn(text: string | undefined | null): string {
  const direct = normalizePhone(text);
  if (direct) return direct;
  const found = String(text ?? '').match(/(?:\+?84|0)\d[\d\s.\-]{7,12}\d/);
  return found ? normalizePhone(found[0]) : '';
}

/** Giá trị lưu cho giờ kết thúc khi file ghi "qua đêm" (làm xuyên đêm, không có giờ cụ thể). */
export const OVERNIGHT_END = 'Qua đêm';

/** Ô giờ ghi "qua đêm", "xuyên đêm", "sáng hôm sau"... */
export function isOvernight(text: string | undefined | null): boolean {
  const folded = foldText(text);
  return /\b(qua|xuyen|suot) dem\b|hom sau|sang mai/.test(folded);
}

/** Giờ kết thúc: "HH:mm", hoặc OVERNIGHT_END nếu ghi "qua đêm"; không đọc được thì trả rỗng. */
export function parseEndTime(text: string | undefined | null): string {
  return parseTime(text) || (isOvernight(text) ? OVERNIGHT_END : '');
}

/** Tên người phải có ít nhất một chữ cái; loại dòng rác như "(2)". */
export function isPersonName(name: string | undefined | null): boolean {
  return /\p{L}/u.test(String(name ?? ''));
}

/** File Excel không đọc được (không có dòng tiêu đề / không có cột họ tên, trạm xe / không có người nào): không nhập gì. */
export class ImportFormatError extends Error {
  constructor(public readonly errors: string[], public readonly fileName = '') {
    super(`File Excel không đúng định dạng nhập (${errors.length} lỗi): ${errors.slice(0, 3).join('; ')}`);
    this.name = 'ImportFormatError';
  }
}

export interface ImportColumns {
  stt: number;
  hoTen: number;
  tramXe: number;
  dienThoai: number;
  tu: number;
  den: number;
  /** -1 nếu file không có cột này */
  maNhanVien?: number;
  noiDung?: number;
  dangKyCom?: number;
}

/** Một người đọc được từ file (đã làm sạch). */
export interface ParsedRegistrationRow {
  /** chỉ số dòng trong sheet (0 = dòng 1 của Excel) */
  rowIndex: number;
  hoTen: string;
  tramXe: string;
  dienThoai: string;
  /** "HH:mm" hoặc rỗng nếu file không ghi */
  tu: string;
  /** "HH:mm", OVERNIGHT_END, hoặc rỗng nếu file không ghi */
  den: string;
  maNhanVien: string;
  noiDungCongViec: string;
  dangKyCom: boolean;
}

export interface SheetValidation {
  /** true khi đọc được ít nhất một người; dòng sai mẫu chỉ bị bỏ qua (xem warnings) */
  valid: boolean;
  /** lỗi làm không đọc được cả sheet */
  errors: string[];
  /** dòng bị bỏ qua hoặc ô bị bỏ trống vì sai mẫu; các dòng khác vẫn được nhập */
  warnings: string[];
  headerRowIndex: number;
  columns: ImportColumns | null;
  dataRows: number;
  rows: ParsedRegistrationRow[];
}

function foldText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

const MAX_REPORTED = 15;

/** Bố cục chuẩn (mẫu cũ): A = STT, B = Họ tên, C = Trạm xe, D = SĐT, E = Từ, F = Đến. Chỉ dùng cho script xuất mẫu. */
export const IMPORT_COLUMNS: ImportColumns = { stt: 0, hoTen: 1, tramXe: 2, dienThoai: 3, tu: 4, den: 5 };

const isNameHeader = (c: string) => !/^ma\b/.test(c) && (/\bho\b.*\bten\b/.test(c) || c === 'ten' || c === 'ten nhan vien' || c === 'nhan vien');
const isSttHeader = (c: string) => c === 'stt' || c === 'tt' || c.includes('so thu tu');
const isStationHeader = (c: string) => /\btram\b/.test(c) || c.includes('diem don') || c.includes('noi don');
const isPhoneHeader = (c: string) => c.includes('dien thoai') || /\bsdt\b|\bso dt\b|^dt$|\bdtdd\b/.test(c);
const isFromHeader = (c: string) => /^tu\b/.test(c) || c.includes('bat dau') || c.includes('gio vao');
const isToHeader = (c: string) => /^den\b/.test(c) || c.includes('ket thuc') || c.includes('gio ra');
const isTimeGroupHeader = (c: string) => c.includes('thoi gian') || c === 'gio lam viec' || c === 'gio lam';
const isEmpIdHeader = (c: string) => /^(ma ?nv|msnv|ma nhan vien|ma so( nhan vien| nv)?|ma)$/.test(c);
const isTaskHeader = (c: string) => c.includes('noi dung') || c.includes('cong viec');
const isMealHeader = (c: string) => c.includes('com') && (c.includes('dang ky') || c.includes('suat'));

/**
 * Tìm cột theo chữ ở dòng tiêu đề (không cố định vị trí). Tiêu đề có thể gộp 2 dòng: "Thời gian làm việc" gộp
 * hai cột ở dòng trên, "Từ" / "Đến" ở dòng dưới. Cần có cột Họ tên và Trạm xe; các cột khác không có thì bỏ qua.
 */
export function detectColumns(header: unknown[], subHeader: unknown[] = []): ImportColumns {
  const width = Math.max(header.length, subHeader.length);
  const top = Array.from({ length: width }, (_, i) => foldText(header[i]));
  const sub = Array.from({ length: width }, (_, i) => foldText(subHeader[i]));
  const find = (ok: (c: string) => boolean, taken: Set<number>) => {
    for (let i = 0; i < width; i++) if (!taken.has(i) && ok(top[i])) return i;
    for (let i = 0; i < width; i++) if (!taken.has(i) && ok(sub[i])) return i;
    return -1;
  };
  const taken = new Set<number>();
  const pick = (ok: (c: string) => boolean) => {
    const index = find(ok, taken);
    if (index >= 0) taken.add(index);
    return index;
  };

  const columns: ImportColumns = {
    stt: pick(isSttHeader),
    hoTen: pick(isNameHeader),
    tramXe: pick(isStationHeader),
    dienThoai: pick(isPhoneHeader),
    maNhanVien: pick(isEmpIdHeader),
    tu: -1,
    den: -1,
    noiDung: -1,
    dangKyCom: pick(isMealHeader),
  };
  columns.tu = pick(isFromHeader);
  columns.den = pick(isToHeader);
  if (columns.tu < 0 || columns.den < 0) {
    // "Thời gian làm việc" gộp hai ô mà không có dòng Từ/Đến: ô đầu = Từ, ô kế (trống) = Đến.
    const group = find(isTimeGroupHeader, taken);
    if (group >= 0) {
      if (columns.tu < 0) { columns.tu = group; taken.add(group); }
      if (columns.den < 0 && group + 1 < width && !top[group + 1] && !taken.has(group + 1)) {
        columns.den = group + 1;
        taken.add(group + 1);
      }
    }
  }
  columns.noiDung = pick(isTaskHeader);
  return columns;
}

/**
 * Đọc một sheet danh sách phụ trội. Bố cục mỗi phòng ban mỗi khác (thêm cột Mã NV, Nội dung, Đăng ký cơm; "Số ĐT";
 * "Thời gian làm việc" gộp hai dòng; giờ "15h45", "qua đêm"), nên cột được nhận theo tiêu đề.
 * - Chỉ từ chối cả sheet khi không thấy dòng tiêu đề có cột Họ tên và Trạm xe, hoặc không có người nào hợp lệ.
 * - Dòng có họ tên/trạm nhưng sai mẫu (tên không phải tên người, thiếu trạm, trạm là số/giờ/SĐT) thì bỏ qua riêng dòng
 *   đó và ghi vào warnings; các dòng khác vẫn nhập.
 * - SĐT / giờ không đọc được thì để trống (hệ thống dùng giờ mặc định) và ghi warnings, người đó vẫn được nhập.
 * - Dòng không có dữ liệu (dòng phụ "Từ/Đến", đánh số cột "(1) (2)", tiêu đề nhóm, "TUYẾN: ...", chữ ký) bỏ qua im lặng.
 */
export function validateRegistrationSheet(rows: unknown[][]): SheetValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed: ParsedRegistrationRow[] = [];
  const cap = (list: string[]) =>
    list.length > MAX_REPORTED ? [...list.slice(0, MAX_REPORTED), `... và ${list.length - MAX_REPORTED} dòng khác`] : list;
  const result = (headerRowIndex: number, columns: ImportColumns | null): SheetValidation => ({
    valid: errors.length === 0 && parsed.length > 0,
    errors: cap(errors),
    warnings: cap(warnings),
    headerRowIndex,
    columns,
    dataRows: parsed.length,
    rows: parsed,
  });

  const data = rows || [];
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(25, data.length); i++) {
    if ((data[i] || []).map(foldText).some(isNameHeader)) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex === -1) {
    errors.push('Không tìm thấy dòng tiêu đề (cần có ô "Họ và tên" trong 25 dòng đầu).');
    return result(-1, null);
  }

  // Dòng ngay dưới tiêu đề là dòng phụ (Từ / Đến) nếu có ô Từ/Đến và không có tên người.
  const next = data[headerRowIndex + 1] || [];
  const nextFolded = next.map(foldText);
  const hasSubHeader = nextFolded.some(c => isFromHeader(c) || isToHeader(c));
  const columns = detectColumns(data[headerRowIndex] || [], hasSubHeader ? next : []);

  if (columns.hoTen < 0) errors.push(`Dòng ${headerRowIndex + 1}: không thấy cột "Họ và tên".`);
  if (columns.tramXe < 0) errors.push(`Dòng ${headerRowIndex + 1}: không thấy cột "Trạm xe".`);
  if (errors.length) return result(headerRowIndex, columns);

  const text = (row: unknown[], index: number | undefined) =>
    index === undefined || index < 0 ? '' : String(row[index] ?? '').trim();
  const known = new Set([columns.stt, columns.hoTen, columns.tramXe, columns.dienThoai, columns.tu, columns.den].filter(i => i >= 0));
  let lastOkRow = -1;
  const badRows: Array<{ row: number; message: string; looksLikeData: boolean }> = [];

  for (let i = headerRowIndex + (hasSubHeader ? 2 : 1); i < data.length; i++) {
    const row = data[i] || [];
    const cells = row.map(cell => String(cell ?? '').trim());
    const nonEmpty = cells.filter(Boolean);
    if (nonEmpty.every(cell => /^\(\d+\)$/.test(cell))) continue; // trống hoặc dòng đánh số cột "(1) (2) (7)"
    if (nonEmpty.length && nonEmpty.every(cell => { const c = foldText(cell); return isFromHeader(c) || isToHeader(c); })) continue;

    const hoTen = text(row, columns.hoTen);
    const tramXe = text(row, columns.tramXe);
    const phoneCell = text(row, columns.dienThoai);
    const from = text(row, columns.tu);
    const to = text(row, columns.den);
    const stt = text(row, columns.stt);
    const placeholderPhone = /^[0\s.\-]*$/.test(phoneCell); // "0", "00", "-" = chưa có số
    if (!hoTen && !tramXe && !findPhoneIn(phoneCell)) continue; // ghi chú, "TUYẾN: ...": không có dữ liệu để nhập
    if (!stt && !tramXe && !findPhoneIn(phoneCell) && !from && !to) continue; // tiêu đề nhóm "Tổ Văn Phòng (03)"
    if (!/\p{L}/u.test(hoTen) && !/\p{L}/u.test(tramXe) && placeholderPhone) continue; // dòng rác "(2)" / "…"

    const line = `Dòng ${i + 1}`;
    const who = hoTen ? ` (${hoTen})` : '';
    let rowProblem = '';
    if (!hoTen) rowProblem = `${line}: thiếu họ và tên`;
    else if (!isPersonName(hoTen) || normalizePhone(hoTen) || /^\d+$/.test(hoTen)) rowProblem = `${line}: "${hoTen}" không phải tên người`;
    else if (hoTen.length > 60) rowProblem = `${line}: họ và tên quá dài, có thể lệch cột`;
    else if (!tramXe) rowProblem = `${line}${who}: thiếu trạm xe`;
    else if (!/\p{L}/u.test(tramXe) || normalizePhone(tramXe) || /^\d{1,2}\s*[h:]\s*\d{2}$/i.test(tramXe)) {
      rowProblem = `${line}${who}: trạm xe "${tramXe}" không phải tên trạm, có thể lệch cột`;
    }

    if (rowProblem) {
      // Dòng lỗi không có SĐT lẫn giờ mà nằm sau người cuối cùng thì chỉ là chân trang (chữ ký, ghi chú).
      const looksLikeData = !!findPhoneIn(phoneCell) || !!parseTime(from) || !!parseTime(to);
      badRows.push({ row: i, message: `${rowProblem} → bỏ qua dòng này.`, looksLikeData });
      continue;
    }

    let dienThoai = findPhoneIn(phoneCell);
    if (!dienThoai && placeholderPhone) {
      // Cột SĐT trống nhưng số nằm ở cột khác (cột thừa): vẫn lấy.
      const stray = cells.findIndex((cell, index) => !known.has(index) && index !== columns.maNhanVien && !!findPhoneIn(cell));
      if (stray >= 0) dienThoai = findPhoneIn(cells[stray]);
    }
    if (!dienThoai && !placeholderPhone) warnings.push(`${line} (${hoTen}): điện thoại "${phoneCell}" không phải số điện thoại → để trống.`);

    const tu = parseTime(from);
    const den = parseEndTime(to);
    if (from && !tu) warnings.push(`${line} (${hoTen}): giờ bắt đầu "${from}" không đọc được → dùng giờ mặc định.`);
    if (to && !den) warnings.push(`${line} (${hoTen}): giờ kết thúc "${to}" không đọc được → dùng giờ mặc định.`);

    const meal = foldText(text(row, columns.dangKyCom));
    parsed.push({
      rowIndex: i,
      hoTen,
      tramXe,
      dienThoai,
      tu,
      den,
      maNhanVien: text(row, columns.maNhanVien),
      noiDungCongViec: text(row, columns.noiDung),
      dangKyCom: !!meal && !/^(khong|ko|k|no|0|-)$/.test(meal),
    });
    lastOkRow = i;
  }

  for (const bad of badRows) {
    if (bad.row < lastOkRow || bad.looksLikeData) warnings.push(bad.message);
  }

  if (parsed.length === 0) {
    errors.push('Không có người nào hợp lệ dưới dòng tiêu đề.');
    errors.push(...badRows.filter(b => b.looksLikeData || b.row < lastOkRow).map(b => b.message));
  }
  return result(headerRowIndex, columns);
}
