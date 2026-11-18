# Đọc "DS PHỤ TRỘI dd.mm.pdf" (xếp tay, kết quả đúng) thành JSON: các xe theo thứ tự trên phiếu, mỗi xe có tên tuyến,
# sức chứa và từng người kèm trạm. Ô trạm gộp nhiều dòng: pdfplumber trả None cho các dòng bị gộp -> lấy trạm dòng trên.
#   python scripts/phu-troi-pdf-parse.py <pdf> [out.json]
# Cần: python -m pip install --user pdfplumber
import json
import re
import sys

import pdfplumber


def capacity_of(note):
    """Sức chứa theo loại xe ghi trên phiếu (16C/29C/45C); None nếu phiếu không ghi loại xe."""
    text = (note or '').upper()
    if re.search(r'45\s*C', text):
        return 44
    if re.search(r'29\s*C', text):
        return 28
    if re.search(r'16\s*C', text):
        return 15
    return None


def parse(path):
    vehicles = []
    date = None
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.find_tables():
                station = None
                for row in table.extract():
                    cells = [(c or '').strip() if c is not None else None for c in row]
                    first = cells[0] or ''
                    m = re.search(r'Ngày\s+(\d+)\s+tháng\s+(\d+)\s+năm\s+(\d+)', first)
                    if m:
                        date = '%02d/%02d/%s' % (int(m.group(1)), int(m.group(2)), m.group(3))
                        continue
                    if len(cells) < 3 or first in ('STT',) or (cells[1] is None and cells[2] is None and first and not first.isdigit()):
                        # Dòng tên tuyến (HCM, BH01, ...): mở một xe mới.
                        if first and first not in ('STT',) and not first.startswith('PHIẾU') and all(c is None for c in cells[1:]):
                            # Loại xe ghi ngay trên dòng tuyến ("Xe: 29C - 60B02263") hoặc ở cột ghi chú ("16C 60F01800").
                            vehicles.append({'label': first, 'capacity': capacity_of(first), 'rows': []})
                            station = None
                        continue
                    name = cells[1]
                    if not name or name == 'Họ và tên' or not vehicles:
                        continue
                    if cells[2]:
                        station = re.sub(r'\s+', ' ', cells[2])
                    note = cells[-1]
                    if note:
                        vehicles[-1]['capacity'] = capacity_of(note) or vehicles[-1]['capacity']
                    vehicles[-1]['rows'].append({'hoTen': re.sub(r'\s+', ' ', name), 'tramXe': station or ''})
    vehicles = [v for v in vehicles if v['rows']]
    for v in vehicles:
        # Phiếu không ghi loại xe (vd. 12/11 "TX BÌNH - ... - 51B 32914"): lấy loại xe nhỏ nhất chở đủ số người trên phiếu.
        if v['capacity'] is None:
            v['capacity'] = next((c for c in (15, 28, 44) if c >= len(v['rows'])), 44)
    return {'date': date, 'vehicles': vehicles}


if __name__ == '__main__':
    result = parse(sys.argv[1])
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if len(sys.argv) > 2:
        with open(sys.argv[2], 'w', encoding='utf-8') as f:
            f.write(text)
    else:
        sys.stdout.buffer.write(text.encode('utf-8'))
