import { Injectable } from '@angular/core';
import { PHU_TROI_STATION_ORDER } from './phu-troi-station-zones';

export interface SortableRegistration {
  hoTen?: string;
  tramXe?: string;
}

/**
 * Logic riêng: thứ tự trạm dọc lộ trình thực tế (phụ trời), không dùng chung với PdfExportService.
 * Danh mục trạm lấy từ mẫu Excel/PDF phụ trời; có thể bổ sung thêm chuỗi vào ORDER.
 */
@Injectable({ providedIn: 'root' })
export class PhuTroiVehicleRouteSortService {
  /**
   * Thứ tự ưu tiên từ đầu chuyến → cuối chuyến (so khớp mờ theo chuỗi con).
   * Chuẩn chỉnh theo phiếu PDF mẫu (vd. PT09.04): sau RMK thường vào Q1 (Hàng Xanh, ĐBP…)
   * rồi mới tới Bà Chiểu, Chợ Gò Vấp, Hóc Môn — không đảo Bà Chiểu lên trước Hàng Xanh.
   *
   * Đối chiếu PDF "DS PHỤ TRỘI 03.11": xe đi HCM đón Bến Gỗ, Long Bình Tân trước rồi mới tới Thủ Đức;
   * các trạm Biên Hòa xếp Cổng 11 … Đại Lộ, An Bình … Tân Mai, rồi Phước Tân, Vũng Tàu, Chung cư Thanh Bình, Huỳnh Văn Lũy.
   * Thứ tự này cũng là thứ tự xếp xe lần lượt (xem PhuTroiVehiclePackingService).
   */
  static readonly STATION_ORDER: readonly string[] = PHU_TROI_STATION_ORDER; // cấu hình tại phu-troi-station-zones.ts

  /** Chuẩn hóa để so khớp tên trạm (bỏ dấu, thường, gộp khoảng trắng). */
  fold(text: string): string {
    if (!text) return '';
    let s = text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    s = s.toLowerCase().replace(/\s+/g, ' ').trim();
    return s;
  }

  /**
   * Chỉ số trạm trên lộ trình.
   * Chọn mẫu khớp **dài nhất** (tránh “Hàng Xanh” nuốt cả “Hàng Xanh (Gần Văn Thánh)” sai thứ tự).
   */
  stationRank(tramXe: string): number {
    const t = this.fold(tramXe);
    if (!t) return 50000;
    // Trùng tên hoàn toàn thì ưu tiên (tránh "Hàng Xanh" bị tính thành "Hàng Xanh (Gần Văn Thánh)").
    const exact = PhuTroiVehicleRouteSortService.STATION_ORDER.findIndex(o => this.fold(o) === t);
    if (exact >= 0) return exact;
    let bestIndex = -1;
    let bestLen = -1;
    for (let i = 0; i < PhuTroiVehicleRouteSortService.STATION_ORDER.length; i++) {
      const o = this.fold(PhuTroiVehicleRouteSortService.STATION_ORDER[i]);
      if (!o) continue;
      if (t.includes(o) || o.includes(t)) {
        if (o.length > bestLen || (o.length === bestLen && (bestIndex < 0 || i < bestIndex))) {
          bestLen = o.length;
          bestIndex = i;
        }
      }
    }
    if (bestIndex < 0) {
      return 40000 + (t.charCodeAt(0) || 0);
    }
    return bestIndex;
  }

  /** Sắp theo thứ tự trạm dọc đường, cùng trạm thì theo họ tên. */
  sortRegistrations<T extends SortableRegistration>(registrations: T[]): T[] {
    return [...registrations].sort((a, b) => {
      const ra = this.stationRank(a.tramXe || '');
      const rb = this.stationRank(b.tramXe || '');
      if (ra !== rb) return ra - rb;
      // Cùng thứ hạng (vd. nhiều trạm lạ hoặc "Tự túc"/"Tự Túc"): gom cùng tên trạm (không phân biệt hoa thường) lại với nhau.
      const sa = this.fold((a.tramXe || '').trim());
      const sb = this.fold((b.tramXe || '').trim());
      if (sa !== sb) return sa < sb ? -1 : 1;
      return (a.hoTen || '').localeCompare(b.hoTen || '', 'vi', { sensitivity: 'base' });
    });
  }

  /** Các trạm xuất hiện theo đúng thứ tự đã sort (để in chân phiếu). */
  uniqueStationsInOrder<T extends SortableRegistration>(sorted: T[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const r of sorted) {
      const st = (r.tramXe || '').trim();
      if (!st || seen.has(st)) continue;
      seen.add(st);
      out.push(st);
    }
    return out;
  }
}
