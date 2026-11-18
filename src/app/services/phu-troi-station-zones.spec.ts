import {
  PHU_TROI_FLOATING_ORDER,
  PHU_TROI_FLOATING_RULES,
  PHU_TROI_STATIONS,
  PHU_TROI_STATION_ORDER,
} from './phu-troi-station-zones';
import { PhuTroiVehicleRouteSortService } from './phu-troi-vehicle-route-sort.service';

describe('Bảng trạm phụ trội (phu-troi-station-zones)', () => {
  const sort = new PhuTroiVehicleRouteSortService();
  const folded = PHU_TROI_STATION_ORDER.map(name => sort.fold(name));

  it('không trùng tên trạm', () => {
    expect(new Set(folded).size).toBe(folded.length);
  });

  it('trạm linh động có trong bảng, có quy tắc và có thứ tự xếp', () => {
    const floating = PHU_TROI_STATIONS.filter(s => s.cls === 'LINH_DONG').map(s => s.name);
    expect(floating.length).toBeGreaterThan(0);
    floating.forEach(name => {
      expect(Object.keys(PHU_TROI_FLOATING_RULES)).toContain(name);
      expect(PHU_TROI_FLOATING_ORDER).toContain(name);
    });
    expect([...PHU_TROI_FLOATING_ORDER].sort()).toEqual([...floating].sort());
  });

  it('thứ tự đón của service sắp xếp lấy từ bảng này', () => {
    expect(PhuTroiVehicleRouteSortService.STATION_ORDER).toEqual(PHU_TROI_STATION_ORDER);
  });

  it('mỗi trạm tự khớp chính nó (không bị trạm khác có tên chứa nó nuốt mất)', () => {
    PHU_TROI_STATION_ORDER.forEach((name, i) => expect(sort.stationRank(name)).toBe(i));
  });
});
