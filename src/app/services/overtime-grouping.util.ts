import { Registration } from '../models/registration.model';

/**
 * Nguyên tắc xếp xe giờ phụ trội:
 *   Gom những nhân viên có cùng TUYẾN và cùng TRẠM vào cùng nhau.
 *
 * - Tuyến lấy theo mã tuyến nhân viên đã đăng ký (maTuyenXe).
 *   Nếu trống, tra tuyến theo tên trạm (bảng chi tiết tuyến đường).
 * - Trạm "tự túc" không cần xe, gom riêng vào nhóm TỰ TÚC.
 * - Trong mỗi tuyến, nhân viên cùng trạm luôn nằm liền nhau,
 *   các trạm xếp theo thứ tự đón (thuTu) của tuyến.
 * - Không có quy tắc ưu tiên/chuyển tuyến hay giới hạn chỗ: không nhân viên nào bị
 *   chuyển sang tuyến khác hoặc bị loại khỏi danh sách.
 */

export const SELF_TRANSPORT_ROUTE = 'TỰ TÚC';
export const UNASSIGNED_ROUTE = 'Chưa phân tuyến';

const ROUTE_ORDER = ['HCM01', 'HCM02', 'BH01', 'BH02', 'BH03'];

export function normalizeStation(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSelfTransportStation(tramXe: string): boolean {
  const s = normalizeStation(tramXe);
  if (!s) return false;
  return ['tu tuc', 'tu di', 'khong can xe', 'tu lo', 'tu sap xep', 'xe may'].some(k => s.includes(k));
}

/**
 * Xác định tuyến của một đăng ký.
 * @param stationToRoute tra tuyến theo tên trạm (trả về null nếu không tìm thấy)
 */
export function resolveOvertimeRoute(
  reg: Pick<Registration, 'maTuyenXe' | 'tramXe'>,
  stationToRoute: (station: string) => string | null
): string {
  if (isSelfTransportStation(reg.tramXe)) {
    return SELF_TRANSPORT_ROUTE;
  }
  const registered = (reg.maTuyenXe || '').trim();
  if (registered) {
    return registered;
  }
  const station = (reg.tramXe || '').trim();
  if (station) {
    return stationToRoute(station) || UNASSIGNED_ROUTE;
  }
  return UNASSIGNED_ROUTE;
}

/** Thứ tự tuyến: HCM01, HCM02, BH01, BH02, BH03, các tuyến khác (A-Z), Chưa phân tuyến, TỰ TÚC. */
export function compareRouteNames(a: string, b: string): number {
  const rank = (r: string): number => {
    if (r === SELF_TRANSPORT_ROUTE) return 1001;
    if (r === UNASSIGNED_ROUTE) return 1000;
    const i = ROUTE_ORDER.indexOf(r);
    return i === -1 ? 500 : i;
  };
  const diff = rank(a) - rank(b);
  return diff !== 0 ? diff : a.localeCompare(b);
}

/**
 * Sắp xếp nhân viên trong một tuyến sao cho cùng trạm thì liền nhau,
 * trạm theo thứ tự đón của tuyến (trạm không có trong tuyến xếp cuối, theo tên).
 */
export function sortByStation<T extends Pick<Registration, 'tramXe' | 'hoTen'>>(
  registrations: T[],
  stationOrder: (station: string) => number | null
): T[] {
  const orderCache = new Map<string, number>();
  const orderOf = (station: string): number => {
    const key = normalizeStation(station);
    if (!orderCache.has(key)) {
      const o = stationOrder(station);
      orderCache.set(key, o === null || o === undefined ? Number.MAX_SAFE_INTEGER : o);
    }
    return orderCache.get(key)!;
  };
  return [...registrations].sort((a, b) => {
    const oa = orderOf(a.tramXe);
    const ob = orderOf(b.tramXe);
    if (oa !== ob) return oa - ob;
    const sa = normalizeStation(a.tramXe);
    const sb = normalizeStation(b.tramXe);
    if (sa !== sb) return sa.localeCompare(sb);
    return (a.hoTen || '').localeCompare(b.hoTen || '');
  });
}

/**
 * Gom đăng ký theo tuyến (và trạm bên trong tuyến).
 * Trả về danh sách tuyến đã sắp xếp, mỗi tuyến có registrations đã gom theo trạm.
 */
export function groupOvertimeByRouteAndStation<T extends Registration>(
  registrations: T[],
  stationToRoute: (station: string) => string | null,
  stationOrderInRoute: (route: string, station: string) => number | null
): { routeName: string; registrations: T[] }[] {
  const byRoute = new Map<string, T[]>();
  for (const reg of registrations) {
    const route = resolveOvertimeRoute(reg, stationToRoute);
    if (!byRoute.has(route)) byRoute.set(route, []);
    byRoute.get(route)!.push(reg);
  }
  return Array.from(byRoute.entries())
    .sort(([a], [b]) => compareRouteNames(a, b))
    .map(([routeName, regs]) => ({
      routeName,
      registrations: sortByStation(regs, station => stationOrderInRoute(routeName, station))
    }));
}
