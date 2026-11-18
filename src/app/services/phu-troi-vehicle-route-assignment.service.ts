import { Injectable } from '@angular/core';

export type GeoDirection = 'HCM' | 'BH' | 'OTHER';

/**
 * Raw employee row from Excel/Web app.
 */
export interface Employee {
  stt: number;
  hoVaTen: string;
  tramXe: string;
  dienThoai: string;
  tu?: string;
  den?: string;
}

/**
 * Direct shape from imported Excel rows.
 */
export interface RawEmployeeRow {
  STT?: number | string;
  'Họ và tên'?: string;
  'Trạm xe'?: string;
  'Điện thoại'?: string;
  'Từ...'?: string;
  'Đến...'?: string;
}

/**
 * Vehicle definition used by routing algorithm.
 * - maxPassengers should be practical max (e.g. 15 for 16 seats).
 * - assignedRouteId can pin a primary vehicle to a route.
 */
export interface VehicleConfig {
  vehicleId: string;
  plateOrType: string;
  driverName: string;
  driverPhone: string;
  maxPassengers: number;
  assignedRouteId?: string;
  supportedRouteIds?: string[];
  isOverflowTaxi?: boolean;
  priority?: number;
}

export interface RouteDefinition {
  routeId: string;
  routeName: string;
  geoDirection: GeoDirection;
  stationOrder: string[];
  stationKeywords: string[];
}

export interface FinalAssignment {
  routeId: string;
  routeName: string;
  driverName: string;
  driverPhone: string;
  vehicleLabel: string;
  isOverflow: boolean;
  headerLine: string;
  employees: Employee[];
}

interface EmployeeWithRoute {
  employee: Employee;
  routeId: string;
}

/**
 * Route presets for current overtime flow.
 * Extend stationKeywords/stationOrder as operations evolves.
 */
export const DEFAULT_ROUTE_DEFINITIONS: RouteDefinition[] = [
  {
    routeId: 'HCM_Main',
    routeName: 'HCM Main',
    geoDirection: 'HCM',
    stationOrder: [
      'Ngã 4 Thủ Đức',
      'RMK',
      'Ngã 3 Cát Lái',
      'BV Hòa Hảo',
      'Hàng Xanh',
      'Đinh Tiên Hoàng',
      'Hai Bà Trưng',
      'Bà Chiểu',
      'Chợ Gò Vấp',
      'Trường Lý Tự Trọng',
      'Hóc Môn',
    ],
    stationKeywords: [
      'ngã 4 thủ đức',
      'nga 4 thu duc',
      'rmk',
      'ngã 3 cát lái',
      'nga 3 cat lai',
      'hòa hảo',
      'hoa hao',
      'hàng xanh',
      'hang xanh',
      'đinh tiên hoàng',
      'dinh tien hoang',
      'hai bà trưng',
      'hai ba trung',
      'bà chiểu',
      'ba chieu',
      'gò vấp',
      'go vap',
      'hóc môn',
      'hoc mon',
      'lý tự trọng',
      'ly tu trong',
    ],
  },
  {
    routeId: 'BH_1',
    routeName: 'Biên Hòa 1',
    geoDirection: 'BH',
    stationOrder: [
      'Cổng 11',
      'Tam Hiệp',
      'BV Đồng Nai',
      'BV 7B',
      'Nhà trẻ Hoa Sen',
      'Giáo xứ Lộc Lâm',
      'Giáo xứ Đại Lộ',
      'Phước Tân',
      'Ngã 3 Bến Gỗ',
      'Ngã 3 Long Bình Tân',
      'Ngã 3 Hãng dầu',
    ],
    stationKeywords: [
      'cổng 11',
      'cong 11',
      'tam hiệp',
      'tam hiep',
      'đồng nai',
      'dong nai',
      '7b',
      'lộc lâm',
      'loc lam',
      'đại lộ',
      'dai lo',
      'phước tân',
      'phuoc tan',
      'bến gỗ',
      'ben go',
      'long bình tân',
      'long binh tan',
      'hãng dầu',
      'hang dau',
      'hoa sen',
    ],
  },
];

function normalizeText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function stationRank(station: string, route: RouteDefinition): number {
  const folded = normalizeText(station);
  if (!folded) return 9000;
  let bestRank = 8000;
  let bestKeywordLength = -1;
  route.stationOrder.forEach((s, idx) => {
    const foldedOrder = normalizeText(s);
    if (!foldedOrder) return;
    if (folded.includes(foldedOrder) || foldedOrder.includes(folded)) {
      const keywordLen = foldedOrder.length;
      if (keywordLen > bestKeywordLength) {
        bestKeywordLength = keywordLen;
        bestRank = idx;
      }
    }
  });
  return bestRank;
}

function resolveRouteIdByStation(station: string, routes: RouteDefinition[]): string {
  const foldedStation = normalizeText(station);
  if (!foldedStation) return 'OTHER';

  let bestRouteId = 'OTHER';
  let bestScore = -1;

  for (const route of routes) {
    for (const keyword of route.stationKeywords) {
      const foldedKeyword = normalizeText(keyword);
      if (!foldedKeyword) continue;
      if (foldedStation.includes(foldedKeyword) || foldedKeyword.includes(foldedStation)) {
        // Longer match wins to reduce ambiguous capture.
        const score = foldedKeyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestRouteId = route.routeId;
        }
      }
    }
  }

  return bestRouteId;
}

function sortEmployeesForRoute(employees: Employee[], route?: RouteDefinition): Employee[] {
  if (!route) {
    return [...employees].sort((a, b) => (a.stt || 0) - (b.stt || 0));
  }
  return [...employees].sort((a, b) => {
    const rankA = stationRank(a.tramXe, route);
    const rankB = stationRank(b.tramXe, route);
    if (rankA !== rankB) return rankA - rankB;
    if ((a.stt || 0) !== (b.stt || 0)) return (a.stt || 0) - (b.stt || 0);
    return (a.hoVaTen || '').localeCompare(b.hoVaTen || '', 'vi', { sensitivity: 'base' });
  });
}

function buildHeaderLine(routeName: string, vehicle: VehicleConfig): string {
  return `TUYẾN: ${routeName} | Tài xế: ${vehicle.driverName} | SĐT: ${vehicle.driverPhone} | Xe: ${vehicle.plateOrType}`;
}

function createVirtualTaxi(index: number): VehicleConfig {
  return {
    vehicleId: `VIRTUAL_TAXI_${index}`,
    plateOrType: `TAXI - Overflow ${index}`,
    driverName: 'Tài xế taxi',
    driverPhone: '',
    maxPassengers: 4,
    isOverflowTaxi: true,
    priority: 9999,
  };
}

function orderVehiclesForRoute(routeId: string, vehicles: VehicleConfig[]): VehicleConfig[] {
  const pinned = vehicles.filter(v => v.assignedRouteId === routeId);
  const supported = vehicles.filter(
    v => v.assignedRouteId !== routeId && (!v.supportedRouteIds || v.supportedRouteIds.includes(routeId))
  );

  const byPriority = (a: VehicleConfig, b: VehicleConfig): number => {
    const overflowA = a.isOverflowTaxi ? 1 : 0;
    const overflowB = b.isOverflowTaxi ? 1 : 0;
    if (overflowA !== overflowB) return overflowA - overflowB;
    const pa = a.priority ?? 999;
    const pb = b.priority ?? 999;
    if (pa !== pb) return pa - pb;
    return b.maxPassengers - a.maxPassengers;
  };

  return [...pinned.sort(byPriority), ...supported.sort(byPriority)];
}

/**
 * Core pure function:
 * 1) classify employees by station -> route
 * 2) sort by station drop-off order
 * 3) pack into primary vehicle first
 * 4) spill over to secondary vehicles and finally taxi (4 pax)
 */
export function assignOvertimeRoutes(
  employees: Employee[],
  vehicles: VehicleConfig[],
  routeDefinitions: RouteDefinition[] = DEFAULT_ROUTE_DEFINITIONS
): FinalAssignment[] {
  if (!employees?.length || !vehicles?.length) return [];

  const assignments: FinalAssignment[] = [];
  const usedVehicleIds = new Set<string>();

  const withRoute: EmployeeWithRoute[] = employees.map(employee => ({
    employee,
    routeId: resolveRouteIdByStation(employee.tramXe, routeDefinitions),
  }));

  const byRoute = new Map<string, Employee[]>();
  for (const row of withRoute) {
    if (!byRoute.has(row.routeId)) byRoute.set(row.routeId, []);
    byRoute.get(row.routeId)!.push(row.employee);
  }

  const routeOrder = routeDefinitions.map(r => r.routeId);
  const routeIds = Array.from(byRoute.keys()).sort((a, b) => {
    const ai = routeOrder.indexOf(a);
    const bi = routeOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  let virtualTaxiCounter = 1;

  for (const routeId of routeIds) {
    const route = routeDefinitions.find(r => r.routeId === routeId);
    const routeName = route?.routeName ?? routeId;
    const sortedEmployees = sortEmployeesForRoute(byRoute.get(routeId) || [], route);
    if (sortedEmployees.length === 0) continue;

    const candidateVehicles = orderVehiclesForRoute(routeId, vehicles).filter(v => !usedVehicleIds.has(v.vehicleId));
    const queue = [...sortedEmployees];

    for (const vehicle of candidateVehicles) {
      if (queue.length === 0) break;
      if (vehicle.maxPassengers <= 0) continue;
      const group = queue.splice(0, vehicle.maxPassengers);
      if (!group.length) continue;
      usedVehicleIds.add(vehicle.vehicleId);
      assignments.push({
        routeId,
        routeName,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone,
        vehicleLabel: vehicle.plateOrType,
        isOverflow: !!vehicle.isOverflowTaxi,
        headerLine: buildHeaderLine(routeName, vehicle),
        employees: group,
      });
    }

    // Overflow fallback: create taxi groups (max 4/passengers taxi).
    while (queue.length > 0) {
      const taxi = createVirtualTaxi(virtualTaxiCounter++);
      const group = queue.splice(0, taxi.maxPassengers);
      assignments.push({
        routeId,
        routeName,
        driverName: taxi.driverName,
        driverPhone: taxi.driverPhone,
        vehicleLabel: taxi.plateOrType,
        isOverflow: true,
        headerLine: buildHeaderLine(routeName, taxi),
        employees: group,
      });
    }
  }

  return assignments;
}

export function mapRawEmployees(rows: RawEmployeeRow[]): Employee[] {
  return (rows || []).map((row, index) => {
    const rawStt = row.STT;
    const parsedStt =
      typeof rawStt === 'number'
        ? rawStt
        : typeof rawStt === 'string' && rawStt.trim() !== ''
          ? Number(rawStt)
          : NaN;

    return {
      stt: Number.isFinite(parsedStt) ? parsedStt : index + 1,
      hoVaTen: (row['Họ và tên'] || '').trim(),
      tramXe: (row['Trạm xe'] || '').trim(),
      dienThoai: (row['Điện thoại'] || '').trim(),
      tu: (row['Từ...'] || '').trim(),
      den: (row['Đến...'] || '').trim(),
    };
  });
}

@Injectable({ providedIn: 'root' })
export class PhuTroiVehicleRouteAssignmentService {
  mapRawEmployees(rows: RawEmployeeRow[]): Employee[] {
    return mapRawEmployees(rows);
  }

  assignOvertimeRoutes(
    employees: Employee[],
    vehicles: VehicleConfig[],
    routeDefinitions: RouteDefinition[] = DEFAULT_ROUTE_DEFINITIONS
  ): FinalAssignment[] {
    return assignOvertimeRoutes(employees, vehicles, routeDefinitions);
  }
}
