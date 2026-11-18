import { Injectable } from '@angular/core';
import { PhuTroiVehicleRouteSortService, SortableRegistration } from './phu-troi-vehicle-route-sort.service';
import {
  PHU_TROI_FLOATING_ORDER,
  PHU_TROI_FLOATING_RULES,
  PHU_TROI_NON_SHUTTLE_STATIONS,
  PHU_TROI_STATIONS,
  PhuTroiFloatingTarget,
} from './phu-troi-station-zones';

export interface PackedVehicle<T> {
  /** Sức chứa hành khách của xe (không tính ghế tài xế). */
  capacity: number;
  registrations: T[];
}

/** Phân công xe cho tuyến lấy từ dialog (chỉ các trường cần dùng). */
export interface PackingAssignment {
  routeCode: string;
  assignedVehicle: { licensePlate: string; vehicleType?: string };
  assignedDriver: { driverName: string; phoneNumber: string };
}

export interface PackingRouteGroup<T> {
  routeName: string;
  registrations: T[];
}

/** Một phiếu xe sau khi xếp: biển số, tài xế và danh sách nhân viên đã sắp theo trạm. */
export interface VehicleLoad<T> {
  plateDisplay: string;
  routeLabel: string;
  driverName: string;
  driverPhone: string;
  isTaxi: boolean;
  registrations: T[];
}

/** Xe trong đội xe để xếp; xe tạm (optional) chỉ dùng khi cần, xe thật luôn được dùng. */
export interface PackingFleetVehicle {
  plate: string;
  routes?: string[];
  driverName?: string;
  driverPhone?: string;
  capacity: number;
  optional?: boolean;
}

const SELF_COMMUTE_ROUTE = 'TỰ TÚC';
const ROUTE_ORDER = ['HCM01', 'HCM02', 'BH01', 'BH02', 'BH03'];
const DEFAULT_CAPACITY = 15;
const MIN_VEHICLES = 4;
const TEMP_PLATE = '16C - (chưa gán xe)';
/** Taxi 4 chỗ chở tối đa 3 người, taxi 7 chỗ chở tối đa 6 người (trừ ghế tài xế). */
const TAXI_4_CAPACITY = 3;
const TAXI_7_CAPACITY = 6;

/** Dưới 4 người đi taxi 4 chỗ; từ 4 người (đến dưới 7) đi taxi 7 chỗ. */
export function taxiCapacityForCount(count: number): number {
  return count < 4 ? TAXI_4_CAPACITY : TAXI_7_CAPACITY;
}

/** Loại taxi ghi trên phiếu theo số người thực tế trên xe. */
export function taxiSeatsOf(passengerCount: number): 4 | 7 {
  return passengerCount < 4 ? 4 : 7;
}

/** Sức chứa hành khách theo loại xe (trừ ghế tài xế): 16 chỗ → 15, 29 chỗ → 28, 45 chỗ → 44. */
export function passengerCapacityOf(vehicleType: string | undefined, plate: string): number {
  const type = (vehicleType || '').toLowerCase();
  if (/(^|\D)4\s*ch/.test(type)) return TAXI_4_CAPACITY;
  if (/taxi/.test(type)) return TAXI_7_CAPACITY;
  const text = `${type} ${plate || ''}`.toLowerCase();
  if (/45/.test(text)) return 44;
  if (/29/.test(text)) return 28;
  if (/16/.test(text)) return 15;
  return DEFAULT_CAPACITY;
}

function plateKey(plate: string): string {
  // Dialog ghi tiền tố loại xe vào biển số ("16C - ", "TAXI - "); cùng biển số là cùng một xe.
  return (plate || '').replace(/^(\d{2}[A-Za-z]|TAXI)\s*-\s*/i, '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Xếp nhân viên phụ trội lên xe theo cách người điều xe làm trong các PDF "DS PHỤ TRỘI" (xem phu-troi-station-zones.ts):
 * 1) bỏ người đi tự túc / ca qua đêm;
 * 2) chia trạm thành 4 cụm theo lộ trình (HCM | B | C | D) và phân đội xe cho từng cụm theo số người và sức chứa
 *    (cụm đông dùng nhiều xe, cụm ít người dùng chung một xe với cụm kề);
 * 3) cụm HCM có hai xe thì xe "phía bắc" nhận Bà Chiểu/Gò Vấp/Hóc Môn, xe "phía nam" nhận RMK/Hàng Xanh/Hòa Hảo,
 *    còn Thủ Đức chia theo chữ cái tên cho cân tải;
 * 4) trạm linh động (Phước Tân, Bến Gỗ, Long Bình Tân, Vũng Tàu) lên xe còn chỗ theo thứ tự ưu tiên;
 * 5) xe nào quá sức chứa thì chuyển nguyên trạm cuối sang xe còn chỗ, hết xe thì đi taxi.
 */
@Injectable({ providedIn: 'root' })
export class PhuTroiVehiclePackingService {
  constructor(private sortService: PhuTroiVehicleRouteSortService) {}

  isSelfCommute(registration: SortableRegistration): boolean {
    const station = this.sortService.fold(registration.tramXe || '');
    // Tự túc, "Ca qua đêm 7h00 sáng hôm sau về": không đi xe đưa đón (PDF xếp chung nhóm tự túc).
    return PHU_TROI_NON_SHUTTLE_STATIONS.some(name => station.startsWith(this.sortService.fold(name)));
  }

  /**
   * Đội xe lấy theo thứ tự tuyến (HCM01, HCM02, BH01, ...), mỗi biển số chỉ tính một xe dù được gán cho nhiều tuyến.
   * Người đi tự túc bị loại. Thiếu xe thì thêm xe 16 chỗ tạm cho đủ 4 xe (xe tạm không dùng đến thì không in).
   */
  planFromAssignments<T extends SortableRegistration>(
    routeGroups: PackingRouteGroup<T>[],
    assignments: PackingAssignment[]
  ): VehicleLoad<T>[] {
    const routes = routeGroups
      .filter(g => g.routeName !== SELF_COMMUTE_ROUTE && g.registrations?.length)
      .sort((a, b) => {
        const ai = ROUTE_ORDER.indexOf(a.routeName);
        const bi = ROUTE_ORDER.indexOf(b.routeName);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.routeName.localeCompare(b.routeName, 'vi');
      });

    const fleet = new Map<string, PackingFleetVehicle>();
    for (const route of routes) {
      const assignment = assignments.find(a => a.routeCode === route.routeName);
      const plate = assignment?.assignedVehicle?.licensePlate?.trim() || '';
      const key = plateKey(plate);
      if (!assignment || !key) continue;
      const vehicle = fleet.get(key);
      if (vehicle) {
        vehicle.routes!.push(route.routeName);
        vehicle.driverName ||= (assignment.assignedDriver?.driverName || '').trim();
        vehicle.driverPhone ||= (assignment.assignedDriver?.phoneNumber || '').trim();
      } else {
        fleet.set(key, {
          plate,
          routes: [route.routeName],
          driverName: (assignment.assignedDriver?.driverName || '').trim(),
          driverPhone: (assignment.assignedDriver?.phoneNumber || '').trim(),
          capacity: passengerCapacityOf(assignment.assignedVehicle.vehicleType, plate),
        });
      }
    }
    const vehicles = [...fleet.values()];
    for (let i = vehicles.length; i < MIN_VEHICLES; i++) {
      vehicles.push({ plate: TEMP_PLATE, routes: [], capacity: DEFAULT_CAPACITY, optional: true });
    }
    return this.planForFleet(routes.flatMap(r => r.registrations), vehicles);
  }

  /** Xếp người lên đội xe cho trước (xe thật theo thứ tự trước, xe tạm optional ở cuối). Hết xe thì đi taxi. */
  planForFleet<T extends SortableRegistration>(registrations: T[], vehicles: PackingFleetVehicle[]): VehicleLoad<T>[] {
    const riders = registrations.filter(r => !this.isSelfCommute(r));
    const loads = this.assignByFleet(riders, vehicles);
    const result: VehicleLoad<T>[] = vehicles.map((vehicle, index) => ({
      plateDisplay: vehicle.plate,
      routeLabel: (vehicle.routes || []).join(', ') || 'XE TẠM',
      driverName: vehicle.driverName || '',
      driverPhone: vehicle.driverPhone || '',
      isTaxi: false,
      registrations: loads.perVehicle[index],
    }));
    // Hết xe: phần còn lại đi taxi (dưới 4 người taxi 4 chỗ, từ 4 người taxi 7 chỗ).
    for (const taxi of this.pack(loads.leftover, [])) {
      result.push({
        plateDisplay: `TAXI ${taxiSeatsOf(taxi.registrations.length)} chỗ`,
        routeLabel: 'TAXI',
        driverName: '',
        driverPhone: '',
        isTaxi: true,
        registrations: taxi.registrations,
      });
    }
    return result.filter(load => load.registrations.length > 0);
  }

  private assignByFleet<T extends SortableRegistration>(
    riders: T[],
    vehicles: PackingFleetVehicle[]
  ): { perVehicle: T[][]; leftover: T[] } {
    const stations = PHU_TROI_STATIONS;
    const nVeh = vehicles.length;
    const caps = vehicles.map(v => v.capacity);
    const size = (groups: T[][]) => groups.reduce((n, g) => n + g.length, 0);
    const rankOf = (group: T[]) => this.sortService.stationRank(group[0].tramXe || '');
    const classOf = (group: T[]): string | null => {
      const rank = rankOf(group);
      return rank >= 0 && rank < stations.length ? stations[rank].cls : null;
    };
    const perVehicle: T[][][] = vehicles.map(() => []);
    if (nVeh === 0) return { perVehicle: [], leftover: riders };

    const groups = this.groupByStation(this.sortService.sortRegistrations(riders));
    const by = (...classes: string[]) => groups.filter(g => classes.includes(classOf(g) || ''));
    const hcmGroups = by('BAC', 'NAM', 'THU_DUC');
    const demand = [size(hcmGroups), size(by('B')), size(by('C')), size(by('D'))];

    // 1) Phân đội xe cho 4 cụm theo thứ tự: mỗi nhóm xe liền nhau; xe thật phải dùng hết, xe tạm (cuối) có thể bỏ.
    const nReal = vehicles.filter(v => !v.optional).length;
    const INF = 1e18;
    const f = Array.from({ length: 5 }, () => Array<number>(nVeh + 1).fill(INF));
    interface Step {
      i: number;
      v: number;
      kind: 'skip' | 'share' | 'multi';
      to: number;
    }
    const back: (Step | null)[][] = Array.from({ length: 5 }, () => Array<Step | null>(nVeh + 1).fill(null));
    const relax = (i: number, v: number, cost: number, step: Step) => {
      if (cost < f[i][v]) {
        f[i][v] = cost;
        back[i][v] = step;
      }
    };
    f[0][0] = 0;
    for (let i = 0; i < 4; i++) {
      for (let v = 0; v <= nVeh; v++) {
        if (f[i][v] >= INF) continue;
        if (demand[i] === 0) {
          relax(i + 1, v, f[i][v], { i, v, kind: 'skip', to: i + 1 });
          continue;
        }
        if (v >= nVeh) continue;
        let sum = 0;
        for (let j = i + 1; j <= 4; j++) {
          sum += demand[j - 1]; // một xe chở chung các cụm i..j-1
          const cost = f[i][v] + Math.max(0, sum - caps[v]) * 1000 + (caps[v] - Math.min(sum, caps[v])) * 0.01;
          relax(j, v + 1, cost, { i, v, kind: 'share', to: j });
        }
        let capSum = caps[v];
        for (let g = 2; g <= 3 && v + g <= nVeh; g++) {
          capSum += caps[v + g - 1]; // cụm i dùng g xe
          // Ngang chi phí thì không chia một cụm ra nhiều xe (16/11: HCM 11 đi một xe, B riêng, C + D chung).
          const cost =
            f[i][v] + Math.max(0, demand[i] - capSum) * 1000 + (capSum - Math.min(demand[i], capSum)) * 0.01 + (g - 1) * 0.001;
          relax(i + 1, v + g, cost, { i, v, kind: 'multi', to: g });
        }
      }
    }
    let endV = -1;
    for (let v = nReal; v <= nVeh; v++) if (f[4][v] < INF && (endV < 0 || f[4][v] < f[4][endV])) endV = v;
    const zoneVehicles: number[][] = [[], [], [], []];
    if (endV < 0) {
      // Không phân được (vd. nhiều xe thật hơn số cụm có người): dồn vào xe đầu, phần quá tải tự chuyển / đi taxi.
      for (let z = 0; z < 4; z++) zoneVehicles[z] = [0];
    } else {
      let i = 4;
      let v = endV;
      while (i > 0) {
        const step = back[i][v] as Step;
        if (step.kind === 'share') for (let z = step.i; z < step.to; z++) if (demand[z]) zoneVehicles[z].push(step.v);
        if (step.kind === 'multi') for (let g = 0; g < step.to; g++) zoneVehicles[step.i].push(step.v + g);
        i = step.i;
        v = step.v;
      }
    }

    // 2) Đặt người của từng cụm lên xe của cụm đó.
    const position = new Map<T[], number>();
    const add = (vehicle: number, group: T[]) => {
      if (group.length) perVehicle[vehicle].push(group);
    };
    const hcmVehicles = zoneVehicles[0];
    if (hcmVehicles.length === 1) {
      hcmGroups.forEach(g => add(hcmVehicles[0], g));
    } else if (hcmVehicles.length >= 2) {
      const first = hcmVehicles[0];
      const last = hcmVehicles[hcmVehicles.length - 1];
      const thuDuc = (by('THU_DUC')[0] || []).slice().sort((a, b) => (a.hoTen || '').localeCompare(b.hoTen || '', 'vi'));
      if (hcmVehicles.length === 2) {
        by('BAC').forEach(g => add(first, g));
        by('NAM').forEach(g => add(last, g));
        // Thủ Đức: k người đầu (theo chữ cái) lên xe phía nam, còn lại lên xe phía bắc, sao cho hai xe cân tải.
        const la = size(perVehicle[first]);
        const lb = size(perVehicle[last]);
        let k = Math.max(0, Math.min(thuDuc.length, Math.round((la + thuDuc.length - lb) / 2)));
        k = Math.min(k, Math.max(0, caps[last] - lb));
        const overNorth = thuDuc.length - k - Math.max(0, caps[first] - la);
        if (overNorth > 0) k = Math.min(thuDuc.length, k + overNorth);
        add(last, thuDuc.slice(0, k));
        add(first, thuDuc.slice(k));
      } else if (hcmVehicles.length === 3) {
        // Ba xe HCM (05/05, 07/05): xe đầu chỉ chở Thủ Đức, xe hai chở phía nam, xe ba chở phía bắc cùng RMK
        // (RMK nằm chung trên đường của cả hai tuyến nên đi theo xe phía bắc). Phần quá tải do bước 4 chuyển đi.
        const isRmk = (g: T[]) => this.sortService.fold(stations[rankOf(g)]?.name || '').startsWith('rmk');
        const [v0, v1, v2] = hcmVehicles;
        by('THU_DUC').forEach(g => add(v0, g));
        by('NAM').filter(g => !isRmk(g)).forEach(g => add(v1, g));
        by('BAC').forEach(g => add(v2, g));
        by('NAM').filter(isRmk).forEach(g => add(v2, g));
      } else {
        // Từ bốn xe trở lên: dàn đều theo thứ tự bắc → Thủ Đức → nam.
        const ordered = [...by('BAC').flat(), ...thuDuc, ...by('NAM').flat()];
        const target = Math.ceil(ordered.length / hcmVehicles.length);
        hcmVehicles.forEach((vehicle, index) => {
          const take = index === hcmVehicles.length - 1 ? ordered.length : Math.min(target, caps[vehicle]);
          this.groupByStation(ordered.splice(0, take)).forEach(g => add(vehicle, g));
        });
      }
    }
    for (const [zone, cls] of [[1, 'B'], [2, 'C'], [3, 'D']] as const) {
      const vs = zoneVehicles[zone];
      let k = 0;
      for (const group of by(cls)) {
        while (k < vs.length - 1 && size(perVehicle[vs[k]]) + group.length > caps[vs[k]]) k++;
        add(vs[k], group);
      }
    }
    // Trạm của cụm khác đi chung xe với cụm HCM thì đứng trước các trạm HCM (xếp tay 09/11: An Bình trước Thủ Đức).
    for (const vehicle of hcmVehicles) {
      for (const group of perVehicle[vehicle]) {
        if (!['THU_DUC', 'BAC', 'NAM'].includes(classOf(group) || '')) position.set(group, rankOf(group) - 1000);
      }
    }

    // 3) Trạm linh động theo thứ tự và ưu tiên trong bảng cấu hình.
    const room = (vehicle: number) => caps[vehicle] - size(perVehicle[vehicle]);
    const fit = (group: T[], candidates: number[], spare = 0) =>
      [...new Set(candidates)].filter(v => room(v) >= group.length + spare).sort((a, b) => room(b) - room(a) || a - b)[0];
    const pool = (target: PhuTroiFloatingTarget): number[] =>
      target === 'HCM' ? zoneVehicles[0]
      : target === 'HCM_NAM' || target === 'HCM_NAM_SPARE' ? zoneVehicles[0].slice(-1)
      : target === 'HCM_BAC' ? zoneVehicles[0].slice(0, 1)
      : target === 'B' ? zoneVehicles[1]
      : target === 'B_BIG' ? zoneVehicles[1].filter(v => caps[v] > DEFAULT_CAPACITY)
      : target === 'C' ? zoneVehicles[2]
      : target === 'C_BIG' ? zoneVehicles[2].filter(v => caps[v] > DEFAULT_CAPACITY)
      : target === 'C_SMALL' ? zoneVehicles[2].filter(v => caps[v] <= DEFAULT_CAPACITY)
      : target === 'D_SMALL' ? zoneVehicles[3].filter(v => caps[v] <= DEFAULT_CAPACITY)
      : zoneVehicles[3];
    const floaterName = (group: T[]) => stations[rankOf(group)].name;
    const floaterOrder = (group: T[]) => {
      const index = PHU_TROI_FLOATING_ORDER.indexOf(floaterName(group));
      return index < 0 ? PHU_TROI_FLOATING_ORDER.length : index;
    };
    const floaters = by('LINH_DONG').sort((a, b) => floaterOrder(a) - floaterOrder(b));
    for (const group of floaters) {
      let chosen: number | undefined;
      for (const target of PHU_TROI_FLOATING_RULES[floaterName(group)] || []) {
        // _SPARE: chỉ lên nếu xe vẫn còn ít nhất một ghế trống sau khi đón cả trạm.
        chosen = fit(group, pool(target), target.endsWith('_SPARE') ? 1 : 0);
        if (chosen !== undefined) break;
      }
      const real = vehicles.map((_, i) => i).filter(i => !vehicles[i].optional);
      const spare = vehicles.map((_, i) => i).filter(i => vehicles[i].optional);
      chosen ??= fit(group, real) ?? fit(group, spare);
      chosen ??= real.concat(spare).sort((a, b) => room(b) - room(a) || a - b)[0];
      add(chosen, group);
    }

    // Trạm lạ (không có trong bảng cấu hình): lên xe còn nhiều chỗ nhất, không bao giờ bị bỏ sót.
    for (const group of groups.filter(g => classOf(g) === null)) {
      const best = vehicles.map((_, i) => i).sort((a, b) => room(b) - room(a) || a - b)[0];
      add(best, group);
    }

    // 4) Quá sức chứa: chuyển nguyên trạm cuối sang xe còn chỗ gần nhất, không xe nào nhận được thì để taxi.
    const positionOf = (g: T[]) => position.get(g) ?? rankOf(g);
    const sortGroups = (list: T[][]) => list.sort((a, b) => positionOf(a) - positionOf(b));
    const spill: T[][] = [];
    perVehicle.forEach((vehicleGroups, vehicle) => {
      sortGroups(vehicleGroups);
      while (size(vehicleGroups) > caps[vehicle]) {
        const excess = size(vehicleGroups) - caps[vehicle];
        const tail = vehicleGroups[vehicleGroups.length - 1];
        if (vehicleGroups.length === 1 || tail.length > excess) {
          const moved = tail.splice(tail.length - Math.min(excess, tail.length), Math.min(excess, tail.length));
          if (tail.length === 0) vehicleGroups.pop();
          spill.push(moved);
        } else {
          spill.push(vehicleGroups.pop() as T[]);
        }
      }
    });
    const leftover: T[] = [];
    spill.sort((a, b) => rankOf(a) - rankOf(b));
    for (const group of spill) {
      let best = -1;
      let bestDistance = Infinity;
      perVehicle.forEach((vehicleGroups, vehicle) => {
        if (size(vehicleGroups) + group.length > caps[vehicle]) return;
        const nearest = Math.min(999, ...vehicleGroups.map(g => Math.abs(rankOf(g) - rankOf(group))));
        const distance = nearest + (vehicles[vehicle].optional ? 1000 : 0);
        if (best === -1 || distance < bestDistance) {
          best = vehicle;
          bestDistance = distance;
        }
      });
      if (best === -1) leftover.push(...group);
      else perVehicle[best].push(group);
    }

    return { perVehicle: perVehicle.map(vehicleGroups => sortGroups(vehicleGroups).flat()), leftover };
  }

  /**
   * @param capacities sức chứa từng xe theo thứ tự ưu tiên (vd. [15, 15, 15, 15]).
   *   Hết xe thì phần còn lại đi taxi: dưới 4 người taxi 4 chỗ, từ 4 người taxi 7 chỗ.
   */
  pack<T extends SortableRegistration>(registrations: T[], capacities: number[]): PackedVehicle<T>[] {
    const riders = registrations.filter(r => !this.isSelfCommute(r));
    const queue = this.groupByStation(this.sortService.sortRegistrations(riders));

    const vehicles: PackedVehicle<T>[] = [];
    const remaining = () => queue.reduce((sum, group) => sum + group.length, 0);
    const nextCapacity = () => capacities[vehicles.length] ?? taxiCapacityForCount(remaining());

    while (queue.length > 0) {
      const capacity = nextCapacity();
      const taken: T[] = [];
      while (queue.length > 0) {
        const group = queue[0];
        const room = capacity - taken.length;
        if (group.length <= room) {
          taken.push(...group);
          queue.shift();
        } else if (taken.length === 0) {
          // nhóm lớn hơn cả xe: buộc phải tách
          taken.push(...group.splice(0, room));
        } else {
          break;
        }
      }
      vehicles.push({ capacity, registrations: taken });
    }
    return vehicles;
  }

  private groupByStation<T extends SortableRegistration>(sorted: T[]): T[][] {
    const groups: T[][] = [];
    let lastKey: string | null = null;
    for (const reg of sorted) {
      const key = this.sortService.fold(reg.tramXe || '');
      if (key !== lastKey) {
        groups.push([]);
        lastKey = key;
      }
      groups[groups.length - 1].push(reg);
    }
    return groups;
  }
}
