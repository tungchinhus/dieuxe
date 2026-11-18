/**
 * Bảng cấu hình duy nhất cho việc xếp xe phụ trội. Khi PDF mới cho thấy trạm đổi nhóm / đổi vị trí / đổi chỗ xếp,
 * chỉ sửa ở đây rồi chạy test đối chiếu PDF (src/app/services/testdata).
 *
 * Cơ sở: PDF "DS PHỤ TRỘI" 03.11, 06.11 (4 xe 16 chỗ), xếp tay 09.11 và 15 PDF ngày 04–22.05 (4–6 xe, có xe 45 chỗ).
 * Tên tuyến BH/HCM trong hệ thống KHÔNG dùng để chia xe vì không khớp cách điều xe thực tế.
 */

/**
 * Nhóm trạm (theo cách người điều xe chia):
 * - THU_DUC: Ngã 4 Thủ Đức, đông và đi được cả hai xe HCM (chia theo thứ tự chữ cái tên, xem service).
 * - BAC: xe HCM "phía bắc" (Bà Chiểu, Gò Vấp, Hóc Môn…). NAM: xe HCM "phía nam" (RMK, Hàng Xanh, Hòa Hảo…).
 * - B: Cổng 11 … Giáo xứ Đại Lộ. C: Ngã 3 An Bình … Vincom. D: Hãng dầu … Bưu điện Tỉnh.
 * - LINH_DONG: Phước Tân, Bến Gỗ, Long Bình Tân, Vũng Tàu: xe nào còn chỗ thì lên (xem PHU_TROI_FLOATING_RULES).
 */
export type PhuTroiStationClass = 'THU_DUC' | 'BAC' | 'NAM' | 'B' | 'C' | 'D' | 'LINH_DONG';

export interface PhuTroiStation {
  name: string;
  cls: PhuTroiStationClass;
}

/** Thứ tự đón trên phiếu. Trạm linh động đứng đầu xe nào nó lên nên được liệt kê trước (theo thứ tự thường gặp). */
export const PHU_TROI_STATIONS: readonly PhuTroiStation[] = [
  { name: 'Phước Tân (Cây xăng Toàn Dung)', cls: 'LINH_DONG' },
  { name: 'Ngã 3 Bến Gỗ', cls: 'LINH_DONG' },
  { name: 'Ngã 3 Long Bình Tân', cls: 'LINH_DONG' },
  { name: 'Ngã 4 Vũng Tàu (Ajinomoto)', cls: 'LINH_DONG' },

  { name: 'Ngã 4 Thủ Đức', cls: 'THU_DUC' },
  { name: 'RMK', cls: 'NAM' },
  { name: 'Hàng Xanh (Gần Văn Thánh)', cls: 'NAM' },
  { name: 'Hàng Xanh', cls: 'NAM' },
  { name: 'Đinh Tiên Hoàng', cls: 'NAM' },
  { name: 'Hai Bà Trưng', cls: 'NAM' },
  { name: 'Ngã 3 Cát Lái', cls: 'NAM' },
  // 16/11 (một xe HCM): Thủ Đức > Lý Tự Trọng > Bà Chiểu > Gò Vấp > Hòa Hảo — Hòa Hảo luôn đón cuối (tháng 5 cũng cuối xe nam).
  { name: 'Trường Lý Tự Trọng', cls: 'BAC' },
  { name: 'Bà Chiểu', cls: 'BAC' },
  { name: 'Chợ Gò Vấp', cls: 'BAC' },
  { name: 'Hóc Môn', cls: 'BAC' },
  { name: 'BV Hòa Hảo', cls: 'NAM' },

  { name: 'Cổng 11 (Cây xăng Thành Thái Thịnh)', cls: 'B' },
  { name: 'Công viên Tam Hiệp', cls: 'B' },
  { name: 'BV Đồng Nai', cls: 'B' },
  { name: 'Nhà trẻ Hoa Sen', cls: 'B' },
  { name: 'BV 7B', cls: 'B' },
  { name: 'BV Tâm Hồng Phước', cls: 'B' },
  { name: 'Giáo xứ Lộc Lâm', cls: 'B' },
  { name: 'Giáo xứ Đại Lộ', cls: 'B' },

  { name: 'Ngã 3 An Bình', cls: 'C' },
  { name: 'Trường Tiểu học An Bình', cls: 'C' },
  { name: 'UBND P.Bình Đa', cls: 'C' },
  { name: 'Đầu đường Trần Quốc Toản', cls: 'C' },
  { name: 'Chùa Long Quang Tự', cls: 'C' },
  { name: 'Cổng chào Tân Mai', cls: 'C' },
  { name: 'Ngã 4 Vincom', cls: 'C' },

  { name: 'Ngã 3 Hãng dầu', cls: 'D' },
  { name: 'Chung cư Thanh Bình', cls: 'D' },
  { name: 'Ngã 3 Huỳnh Văn Lũy (đối diện Metro)', cls: 'D' },
  { name: 'Bưu điện Tỉnh', cls: 'D' },
];

/** Nơi một trạm linh động có thể lên xe, theo thứ tự ưu tiên; xe nào còn nhiều chỗ nhất trong nhóm thì lên trước. */
export type PhuTroiFloatingTarget =
  | 'HCM'
  | 'HCM_NAM'
  | 'HCM_NAM_SPARE'
  | 'HCM_BAC'
  | 'B'
  | 'B_BIG'
  | 'C'
  | 'C_BIG'
  | 'C_SMALL'
  | 'D'
  | 'D_SMALL';

/**
 * Quy luật rút ra từ 19 ngày PDF (dò trên tất cả các ngày, giữ tháng 11 xe 16 chỗ khớp tuyệt đối):
 * - Bến Gỗ: xe HCM phía nam nếu đón xong vẫn còn ít nhất một ghế trống (12/11: HCM 13 + 2 sẽ đầy 15 → sang xe C),
 *   không thì xe cụm C.
 * - Phước Tân: xe HCM phía nam nếu vừa nguyên trạm, không thì xe lớn (29/45 chỗ) của cụm B, rồi xe HCM bất kỳ.
 * - Vũng Tàu: xe cụm C.
 * - Long Bình Tân: xe lớn (29/45 chỗ) của cụm C; ngày toàn xe 16 chỗ thì xe cụm D, rồi xe HCM phía nam.
 * "Xe lớn" (_BIG) là xe trên 15 chỗ khách; _SPARE là đích chỉ nhận khi còn dư ghế sau khi đón. Không có chỗ nào vừa thì lên xe còn nhiều chỗ nhất
 * (sau đó phần quá tải chuyển sang xe khác hoặc taxi).
 */
export const PHU_TROI_FLOATING_RULES: Readonly<Record<string, readonly PhuTroiFloatingTarget[]>> = {
  'Ngã 3 Bến Gỗ': ['HCM_NAM_SPARE', 'C'],
  'Phước Tân (Cây xăng Toàn Dung)': ['HCM_NAM', 'B_BIG', 'HCM'],
  'Ngã 4 Vũng Tàu (Ajinomoto)': ['C'],
  'Ngã 3 Long Bình Tân': ['C_BIG', 'D', 'HCM_NAM'],
};

/** Thứ tự xếp các trạm linh động (trạm xếp trước chiếm chỗ trước). */
export const PHU_TROI_FLOATING_ORDER: readonly string[] = [
  'Ngã 3 Bến Gỗ',
  'Phước Tân (Cây xăng Toàn Dung)',
  'Ngã 4 Vũng Tàu (Ajinomoto)',
  'Ngã 3 Long Bình Tân',
];

/** Trạm không lên xe đưa đón (khớp phần đầu tên sau khi bỏ dấu, chữ thường): tự túc, làm xuyên đêm. */
export const PHU_TROI_NON_SHUTTLE_STATIONS: readonly string[] = ['tự túc', 'ca qua đêm'];

/** Thứ tự đón toàn tuyến. */
export const PHU_TROI_STATION_ORDER: readonly string[] = PHU_TROI_STATIONS.map(station => station.name);
