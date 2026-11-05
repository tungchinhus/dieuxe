import { Registration } from '../models/registration.model';

/**
 * QUY LUẬT XẾP XE GIỜ PHỤ TRỘI (đối chiếu danh sách chuẩn ngày 04/11/2026)
 *
 * 1. Bỏ khỏi danh sách xe: nhân viên "tự túc" và các dòng rác (họ tên không có chữ cái).
 * 2. Tuyến xác định theo TRẠM, dựa vào bảng chi tiết tuyến đường (chiTietTuyenDuong).
 *    (Mã tuyến đăng ký chỉ dùng khi trạm không có trong bảng.)
 * 3. Nhân viên cùng trạm luôn đi chung một xe, không bao giờ tách trạm.
 * 4. Mỗi tuyến là 1 xe 16 chỗ, chở tối đa 15 nhân viên.
 * 5. Khu vực:
 *    - Trạm chỉ thuộc tuyến HCM -> khu HCM; trạm chỉ thuộc tuyến BH -> khu BH.
 *    - Trạm thuộc cả HCM và BH (Ngã 3 Bến Gỗ, Ngã 3 Long Bình Tân) -> ưu tiên đi HCM,
 *      chỉ sang BH khi HCM không còn chỗ.
 * 6. Trong một khu vực:
 *    - Trạm chỉ thuộc 1 tuyến -> vào đúng tuyến đó.
 *    - Trạm thuộc nhiều tuyến -> vào tuyến có số thứ tự LỚN NHẤT còn đủ chỗ
 *      (ví dụ Ngã 4 Vũng Tàu, Chung cư Thanh Bình, Huỳnh Văn Lũy -> BH03).
 *    - Nếu không tuyến nào của trạm còn đủ chỗ -> vào tuyến khác cùng khu còn đủ chỗ
 *      (ví dụ Phước Tân khi BH01, BH02 đã gần đầy -> BH03).
 * 7. Gộp xe: hai tuyến cùng khu mà tổng ≤ 15 người thì đi chung 1 xe
 *    (ví dụ HCM01 + HCM02 = 14 người -> 1 xe HCM01).
 * 8. Thứ tự: tuyến HCM01, HCM02, BH01, BH02, BH03...; trong tuyến, trạm theo thứ tự đón.
 */

export const SELF_TRANSPORT_ROUTE = 'TỰ TÚC';
export const UNASSIGNED_ROUTE = 'Chưa phân tuyến';
export const MAX_PER_VEHICLE = 15;

export interface RouteStop {
  maTuyenXe: string;
  tenDiemDon: string;
  thuTu: number;
}

export interface OvertimeRouteGroup<T> {
  routeName: string;
  registrations: T[];
}

export function normalizeStation(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSelfTransportStation(tramXe: string): boolean {
  const s = normalizeStation(tramXe);
  if (!s) return false;
  return ['tu tuc', 'tu di', 'khong can xe', 'tu lo', 'tu sap xep', 'xe may'].some(k => s.includes(k));
}

/** Dòng rác khi import (vd họ tên "(2)") */
export function isInvalidRegistration(reg: Pick<Registration, 'hoTen'>): boolean {
  return !/\p{L}/u.test(reg.hoTen || '');
}

function areaOf(route: string): string {
  const m = /^[A-Za-z]+/.exec(route || '');
  return m ? m[0].toUpperCase() : route;
}

function routeNumber(route: string): number {
  const m = /(\d+)\s*$/.exec(route || '');
  return m ? parseInt(m[1], 10) : 0;
}

const AREA_ORDER = ['HCM', 'BH'];

export function compareRouteNames(a: string, b: string): number {
  const rank = (r: string): number => {
    if (r === SELF_TRANSPORT_ROUTE) return 1001;
    if (r === UNASSIGNED_ROUTE) return 1000;
    const i = AREA_ORDER.indexOf(areaOf(r));
    return i === -1 ? 500 : i;
  };
  const d = rank(a) - rank(b);
  if (d !== 0) return d;
  const n = routeNumber(a) - routeNumber(b);
  return n !== 0 ? n : a.localeCompare(b);
}

interface StationGroup<T> {
  key: string;
  regs: T[];
  candidates: string[]; // các tuyến chứa trạm (theo bảng chi tiết tuyến)
  placed?: string; // tuyến được xếp trước khi gộp xe
}

/**
 * Xếp nhân viên phụ trội vào xe theo quy luật ở đầu file.
 * Trả về danh sách tuyến (mỗi tuyến = 1 xe), đã sắp xếp; trạm trong tuyến theo thứ tự đón.
 * Nhân viên tự túc và dòng rác không có trong kết quả.
 */
export function groupOvertimeByRouteAndStation<T extends Pick<Registration, 'hoTen' | 'tramXe' | 'maTuyenXe'>>(
  registrations: T[],
  routeStops: RouteStop[],
  maxPerVehicle: number = MAX_PER_VEHICLE
): OvertimeRouteGroup<T>[] {
  // Bảng: trạm (chuẩn hoá) -> {tuyến -> thứ tự}
  const stationRoutes = new Map<string, Map<string, number>>();
  const allRoutes = new Set<string>();
  for (const stop of routeStops || []) {
    if (!stop?.maTuyenXe || !stop?.tenDiemDon) continue;
    const key = normalizeStation(stop.tenDiemDon);
    if (!stationRoutes.has(key)) stationRoutes.set(key, new Map());
    stationRoutes.get(key)!.set(stop.maTuyenXe, Number(stop.thuTu) || 0);
    allRoutes.add(stop.maTuyenXe);
  }

  // 1 + 3. Lọc và gom theo trạm
  const stations = new Map<string, StationGroup<T>>();
  const unassigned: T[] = [];
  for (const reg of registrations) {
    if (isInvalidRegistration(reg) || isSelfTransportStation(reg.tramXe)) continue;
    const key = normalizeStation(reg.tramXe);
    const known = stationRoutes.get(key);
    if (!known) {
      const registered = (reg.maTuyenXe || '').trim();
      if (registered) {
        const k = `__route__${registered}__${key}`;
        if (!stations.has(k)) stations.set(k, { key: k, regs: [], candidates: [registered] });
        stations.get(k)!.regs.push(reg);
        allRoutes.add(registered);
      } else {
        unassigned.push(reg);
      }
      continue;
    }
    if (!stations.has(key)) {
      stations.set(key, { key, regs: [], candidates: Array.from(known.keys()) });
    }
    stations.get(key)!.regs.push(reg);
  }

  const load = new Map<string, number>();
  const assigned = new Map<string, StationGroup<T>[]>();
  const put = (route: string, st: StationGroup<T>) => {
    st.placed = route;
    load.set(route, (load.get(route) || 0) + st.regs.length);
    if (!assigned.has(route)) assigned.set(route, []);
    assigned.get(route)!.push(st);
  };
  const fits = (route: string, st: StationGroup<T>) => (load.get(route) || 0) + st.regs.length <= maxPerVehicle;
  const byNumberDesc = (rs: string[]) => [...rs].sort((a, b) => routeNumber(b) - routeNumber(a));
  const routesInArea = (area: string) => Array.from(allRoutes).filter(r => areaOf(r) === area);

  const groups = Array.from(stations.values());
  const areasOf = (st: StationGroup<T>) => Array.from(new Set(st.candidates.map(areaOf)));

  // 6a. Trạm chỉ thuộc 1 tuyến
  for (const st of groups.filter(s => s.candidates.length === 1)) put(st.candidates[0], st);

  // 6b. Trạm nhiều tuyến trong cùng 1 khu
  const tryPlace = (st: StationGroup<T>, area: string): boolean => {
    const own = byNumberDesc(st.candidates.filter(r => areaOf(r) === area));
    const ownFit = own.find(r => fits(r, st));
    if (ownFit) { put(ownFit, st); return true; }
    const other = byNumberDesc(routesInArea(area).filter(r => !own.includes(r)));
    const otherFit = other.find(r => fits(r, st));
    if (otherFit) { put(otherFit, st); return true; }
    return false;
  };
  const multi = groups.filter(s => s.candidates.length > 1);
  for (const st of multi.filter(s => areasOf(s).length === 1)) {
    const area = areasOf(st)[0];
    if (!tryPlace(st, area)) put(byNumberDesc(st.candidates)[0], st); // quá tải: giữ nguyên trạm, xe lớn hơn
  }
  // 5. Trạm thuộc cả HCM và BH: ưu tiên HCM
  const mixed = multi
    .filter(s => areasOf(s).length > 1)
    .sort((a, b) => b.regs.length - a.regs.length);
  for (const st of mixed) {
    const areas = areasOf(st).sort((a, b) => {
      const ia = AREA_ORDER.indexOf(a), ib = AREA_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    if (!areas.some(area => tryPlace(st, area))) put(byNumberDesc(st.candidates)[0], st);
  }

  // 7. Gộp xe cùng khu nếu tổng ≤ sức chứa (gộp vào tuyến số nhỏ hơn)
  let merged = true;
  while (merged) {
    merged = false;
    const used = Array.from(assigned.keys()).sort(compareRouteNames);
    outer: for (let i = 0; i < used.length; i++) {
      for (let j = i + 1; j < used.length; j++) {
        const a = used[i], b = used[j];
        if (areaOf(a) !== areaOf(b)) continue;
        if ((load.get(a) || 0) + (load.get(b) || 0) <= maxPerVehicle) {
          assigned.get(a)!.push(...assigned.get(b)!);
          load.set(a, (load.get(a) || 0) + (load.get(b) || 0));
          assigned.delete(b);
          load.delete(b);
          merged = true;
          break outer;
        }
      }
    }
  }

  // 8. Sắp xếp trạm trong tuyến theo thứ tự đón
  const stopOrder = (route: string, st: StationGroup<T>): number => {
    const known = stationRoutes.get(st.key);
    if (!known) return Number.MAX_SAFE_INTEGER;
    if (known.has(route)) return known.get(route)!;
    const placed = st.placed || route;
    if (placed !== route) {
      // Trạm của tuyến đã gộp vào: xếp sau các trạm của tuyến chính, theo thứ tự tuyến gốc
      const o = known.get(placed) ?? Math.min(...Array.from(known.values()));
      return routeNumber(placed) * 1000 + o;
    }
    // Trạm được chuyển sang tuyến không chứa nó: theo thứ tự nhỏ nhất ở các tuyến của nó
    return Math.min(...Array.from(known.values())) - 0.5;
  };

  const result: OvertimeRouteGroup<T>[] = Array.from(assigned.entries())
    .sort(([a], [b]) => compareRouteNames(a, b))
    .map(([routeName, sts]) => ({
      routeName,
      registrations: [...sts]
        .sort((x, y) => stopOrder(routeName, x) - stopOrder(routeName, y) || x.key.localeCompare(y.key))
        .flatMap(s => s.regs)
    }));

  if (unassigned.length) {
    result.push({ routeName: UNASSIGNED_ROUTE, registrations: unassigned });
  }
  return result;
}
