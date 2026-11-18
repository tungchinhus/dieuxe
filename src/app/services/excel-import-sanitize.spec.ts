import {
  validateRegistrationSheet, detectColumns, findPhoneIn, isPersonName, normalizePhone, parseTime, parseEndTime, OVERNIGHT_END
} from './excel-import-sanitize';

describe('Làm sạch dữ liệu giờ / SĐT (góp ý báo cáo 09/11)', () => {
  it('SĐT không bị hiểu thành giờ (0918646042 từng ra "42:00", 383538684 ra "84:00")', () => {
    expect(parseTime('0918646042')).toBe('');
    expect(parseTime('383538684')).toBe('');
    expect(parseTime('0383 538 684')).toBe('');
  });

  it('đọc giờ hợp lệ, bỏ giờ vô lý', () => {
    expect(parseTime('15h45')).toBe('15:45');
    expect(parseTime('7h30')).toBe('07:30');
    expect(parseTime('19:00')).toBe('19:00');
    expect(parseTime('19h')).toBe('19:00');
    expect(parseTime('1945')).toBe('19:45');
    expect(parseTime('42:00')).toBe('');
    expect(parseTime('Ca qua đêm')).toBe('');
  });

  it('chuẩn hóa SĐT: thêm số 0 bị mất, bỏ khoảng trắng', () => {
    expect(normalizePhone(934178545)).toBe('0934178545');
    expect(normalizePhone('0383 538 684')).toBe('0383538684');
    expect(normalizePhone('0908111034')).toBe('0908111034');
    expect(normalizePhone('+84908111034')).toBe('0908111034');
  });

  it('ô không phải SĐT (tên trạm, "Tự túc", "15h45") thì trả rỗng', () => {
    expect(normalizePhone('Chợ Gò Vấp')).toBe('');
    expect(normalizePhone('Tự túc')).toBe('');
    expect(normalizePhone('15h45')).toBe('');
    expect(findPhoneIn('0908111034 - ca đêm')).toBe('0908111034');
  });

  it('loại dòng rác không phải tên người như "(2)"', () => {
    expect(isPersonName('(2)')).toBeFalse();
    expect(isPersonName('Trần Thanh Long')).toBeTrue();
  });
});

describe('parseEndTime: "qua đêm" là giờ kết thúc hợp lệ', () => {
  it('nhận "qua đêm", "Qua Đêm", "xuyên đêm"', () => {
    expect(parseEndTime('qua đêm')).toBe(OVERNIGHT_END);
    expect(parseEndTime('Qua Đêm')).toBe(OVERNIGHT_END);
    expect(parseEndTime('qua\nđêm')).toBe(OVERNIGHT_END);
    expect(parseEndTime('xuyên đêm')).toBe(OVERNIGHT_END);
    expect(parseEndTime('19h00')).toBe('19:00');
    expect(parseEndTime('abc')).toBe('');
  });
});

describe('validateRegistrationSheet: nhận cột theo tiêu đề, chỉ bỏ dòng sai mẫu', () => {
  const HEADER = ['STT', 'Họ và tên', 'Trạm xe', 'SĐT', 'Từ', 'Đến'];
  const good = (n = 1) => [n, 'Nguyễn Văn A', 'Ngã 4 Thủ Đức', '0907428432', '15:45', '19:00'];
  const sheet = (...rows: unknown[][]) => [['PHIẾU BÁO LÀM THÊM GIỜ'], ['Ngày 17/5/2026'], HEADER, ...rows];

  it('file KCS 17/11 (ảnh chụp): tiêu đề gộp 2 dòng, cột Mã NV, giờ "qua đêm" → nhận đủ 2 người', () => {
    const kcs = [
      ['Căn cứ theo tình hình sản xuất và giao hàng của Công ty, Phòng KCS đăng ký nhân sự đi làm như sau:'],
      ['STT', 'Họ và Tên', 'Trạm xe', 'Số ĐT', 'Thời gian làm việc', '', 'Nội dung công việc', 'Đăng ký cơm', 'Mã nhân viên'],
      ['', '', '', '', 'Từ', 'Đến', '', '', ''],
      ['1', 'Trần Thanh Hùng', 'Chợ Gò Vấp', '0906306580', '15h45', '19h00', 'KT cơ khí', 'Không', 'THI00112'],
      ['2', 'Đinh Bá Thư', 'BV Tâm Hồng Phước', '0938979037', '15h45', 'qua đêm', 'KT hoàn chỉnh', 'Không', 'THI00103'],
    ];
    const result = validateRegistrationSheet(kcs);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.valid).toBeTrue();
    expect(result.rows.map(r => r.hoTen)).toEqual(['Trần Thanh Hùng', 'Đinh Bá Thư']);
    const thu = result.rows[1];
    expect(thu.tramXe).toBe('BV Tâm Hồng Phước');
    expect(thu.dienThoai).toBe('0938979037');
    expect(thu.tu).toBe('15:45');
    expect(thu.den).toBe(OVERNIGHT_END);
    expect(thu.maNhanVien).toBe('THI00103');
    expect(thu.noiDungCongViec).toBe('KT hoàn chỉnh');
    expect(thu.dangKyCom).toBeFalse();
  });

  it('chấp nhận bố cục chuẩn A–F, kể cả dòng trống và dòng "TUYẾN: ..." cuối khối', () => {
    const result = validateRegistrationSheet(sheet(good(1), good(2), ['TUYẾN: HCM01 | Tài xế: A | SĐT: 0900000000 | Xe: 60F01800'], [], good(1)));
    expect(result.errors).toEqual([]);
    expect(result.valid).toBeTrue();
    expect(result.dataRows).toBe(3);
  });

  it('chấp nhận bố cục thật của phòng ban: dòng đánh số cột, tiêu đề nhóm, dòng tổng cộng', () => {
    const real = [
      ['PHIẾU ĐĂNG KÝ'],
      ['STT', 'Họ và Tên', 'Trạm xe', 'Số ĐT', 'Thời gian làm việc', '', 'Nội dung công việc', 'Đăng ký cơm', 'Mã nhân viên'],
      ['', '', '', '', 'Từ', 'Đến', '', '', ''],
      ['(1)', '(2)', '(7)', '(4)', '(5)', '', '(3)'],
      ['1', 'Lê Ngọc Thanh', 'Ngã 3 An Bình', '0934 178 545', '15h45', '19h00', 'Trực sửa chữa', 'Có', 'THI00089'],
      ['2', 'Phạm Văn C', 'Tự túc', '0', '', '', '', '', 'THI00090'],
      ['', 'Tổ Văn Phòng (03)', '', '', '', ''],
      ['Tổng cộng: 2'],
    ];
    const result = validateRegistrationSheet(real);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.dataRows).toBe(2);
    expect(result.rows[0].dienThoai).toBe('0934178545');
    expect(result.rows[0].dangKyCom).toBeTrue();
  });

  it('nhận cột theo tiêu đề khi có cột Mã NV chen giữa (không còn cố định A–F)', () => {
    const shifted = [['STT', 'Mã NV', 'Họ tên', 'Trạm xe', 'SĐT', 'Thời gian làm việc', ''], [1, 'THI001', 'Lê Ngọc Thanh', 'BV 7B', '0934178545', '15h45', '19h00']];
    const result = validateRegistrationSheet(shifted);
    expect(result.valid).toBeTrue();
    expect(result.rows[0]).toEqual(jasmine.objectContaining({ hoTen: 'Lê Ngọc Thanh', tramXe: 'BV 7B', maNhanVien: 'THI001', tu: '15:45', den: '19:00' }));
  });

  it('nhận bố cục xuất cũ có cột trống chen giữa (Từ/Đến ở cột F, G)', () => {
    const exported = [['STT', 'Họ và tên', 'Trạm xe', 'Điện thoại', '', 'Từ...', 'Đến...'], [1, 'Nguyễn Văn A', 'BV 7B', '0907428432', '', '15:45', '20:00']];
    const result = validateRegistrationSheet(exported);
    expect(result.valid).toBeTrue();
    expect(result.rows[0].den).toBe('20:00');
  });

  it('detectColumns: không có cột SĐT / giờ thì trả -1, vẫn đọc được tên và trạm', () => {
    const cols = detectColumns(['TT', 'Họ tên', 'Điểm đón']);
    expect(cols).toEqual(jasmine.objectContaining({ stt: 0, hoTen: 1, tramXe: 2, dienThoai: -1, tu: -1, den: -1 }));
  });

  it('chấp nhận số điện thoại mất số 0 đầu (dạng số) và giờ dạng 15h45', () => {
    expect(validateRegistrationSheet(sheet([1, 'Lê B', 'BV 7B', 934178545, '15h45', '19h00'])).valid).toBeTrue();
  });

  it('từ chối khi không có dòng tiêu đề', () => {
    const result = validateRegistrationSheet([['abc', 'def'], good()]);
    expect(result.valid).toBeFalse();
    expect(result.errors[0]).toContain('tiêu đề');
  });

  it('từ chối khi không có cột Trạm xe', () => {
    const result = validateRegistrationSheet([['STT', 'Họ và tên', 'SĐT'], [1, 'A B', '0907428432']]);
    expect(result.valid).toBeFalse();
    expect(result.errors.join(' ')).toContain('Trạm xe');
  });

  it('dòng sai mẫu giữa danh sách chỉ bỏ dòng đó, các dòng khác vẫn nhập', () => {
    const result = validateRegistrationSheet(sheet(good(1), [2, '', 'BV 7B', '0907000000', '', ''], good(3)));
    expect(result.valid).toBeTrue();
    expect(result.dataRows).toBe(2);
    expect(result.warnings[0]).toContain('Dòng 5');
    expect(result.warnings[0]).toContain('bỏ qua');
  });

  it('bỏ dòng có trạm là số điện thoại / mã số, giữ người khác', () => {
    const result = validateRegistrationSheet(sheet(
      good(1),
      [2, 'Nguyễn Văn B', '0907428432', '', '15:45', '19:00'],
      [3, 'Nguyễn Văn C', '12345', '0907428433', '15:45', '19:00'],
    ));
    expect(result.rows.map(r => r.hoTen)).toEqual(['Nguyễn Văn A']);
    expect(result.warnings.length).toBe(2);
  });

  it('bỏ dòng tên không phải người khi có trạm hợp lệ, giữ người khác', () => {
    const result = validateRegistrationSheet(sheet(good(1), ['3', '(2)', 'BV 7B', '0907000000', '', '']));
    expect(result.dataRows).toBe(1);
    expect(result.warnings.length).toBe(1);
  });

  it('giờ / SĐT không đọc được: vẫn nhập người đó, để trống ô và cảnh báo', () => {
    const result = validateRegistrationSheet(sheet([1, 'Nguyễn Văn A', 'BV 7B', 'không có', '42:00', '19:00']));
    expect(result.valid).toBeTrue();
    expect(result.rows[0]).toEqual(jasmine.objectContaining({ dienThoai: '', tu: '', den: '19:00' }));
    expect(result.warnings.length).toBe(2);
  });

  it('SĐT nằm ở cột thừa khi cột SĐT trống thì vẫn lấy được', () => {
    const result = validateRegistrationSheet(sheet([1, 'Nguyễn Văn A', 'BV 7B', '', '15:45', '19:00', '0907428432']));
    expect(result.rows[0].dienThoai).toBe('0907428432');
  });

  it('chân trang (chữ ký) sau người cuối không bị báo', () => {
    const result = validateRegistrationSheet(sheet(good(1), ['', 'Người lập phiếu', '', '', '', ''], ['', '', 'Trưởng phòng', '', '', '']));
    expect(result.warnings).toEqual([]);
    expect(result.dataRows).toBe(1);
  });

  it('từ chối sheet không có người nào hợp lệ', () => {
    expect(validateRegistrationSheet(sheet()).valid).toBeFalse();
    const allBad = validateRegistrationSheet(sheet([1, 'Nguyễn Văn A', '', '0907428432', '15:45', '19:00']));
    expect(allBad.valid).toBeFalse();
    expect(allBad.errors.join(' ')).toContain('thiếu trạm xe');
  });
});
