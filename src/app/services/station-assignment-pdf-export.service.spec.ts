import { TestBed } from '@angular/core/testing';
import { StationAssignmentPdfExportService } from './station-assignment-pdf-export.service';
import { FirestoreService } from './firestore.service';
import { RouteDetailService } from './route-detail.service';
import { StationAssignment } from '../models/vehicle.model';

describe('StationAssignmentPdfExportService', () => {
  let service: StationAssignmentPdfExportService;
  let mockFirestoreService: jasmine.SpyObj<FirestoreService>;
  let mockRouteDetailService: jasmine.SpyObj<RouteDetailService>;

  beforeEach(() => {
    const firestoreSpy = jasmine.createSpyObj('FirestoreService', ['getCollection']);
    const routeDetailSpy = jasmine.createSpyObj('RouteDetailService', ['getRouteDetails']);

    TestBed.configureTestingModule({
      providers: [
        StationAssignmentPdfExportService,
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: RouteDetailService, useValue: routeDetailSpy }
      ]
    });

    service = TestBed.inject(StationAssignmentPdfExportService);
    mockFirestoreService = TestBed.inject(FirestoreService) as jasmine.SpyObj<FirestoreService>;
    mockRouteDetailService = TestBed.inject(RouteDetailService) as jasmine.SpyObj<RouteDetailService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Station Sorting Logic', () => {
    it('should sort stations by thuTu field when available', async () => {
      // Arrange
      const mockAssignments: StationAssignment[] = [
        {
          stationId: '1',
          stationName: 'Ngã 4 Thủ Đức',
          routeCode: 'HCM01',
          routeName: 'Tuyến HCM01',
          employeeCount: 12,
          assignedAt: new Date(),
          assignedDriver: { driverId: '1', driverName: 'Driver 1', phoneNumber: '123' },
          assignedVehicle: { vehicleId: '1', licensePlate: 'ABC123', vehicleType: 'Xe 16 chỗ', capacity: 16 },
          thuTu: 3
        },
        {
          stationId: '2',
          stationName: 'Ngã 3 Bến Gỗ',
          routeCode: 'HCM01',
          routeName: 'Tuyến HCM01',
          employeeCount: 5,
          assignedAt: new Date(),
          assignedDriver: { driverId: '2', driverName: 'Driver 2', phoneNumber: '456' },
          assignedVehicle: { vehicleId: '2', licensePlate: 'DEF456', vehicleType: 'Xe 7 chỗ', capacity: 7 },
          thuTu: 1
        },
        {
          stationId: '3',
          stationName: 'BV Hòa Hảo',
          routeCode: 'HCM01',
          routeName: 'Tuyến HCM01',
          employeeCount: 11,
          assignedAt: new Date(),
          assignedDriver: { driverId: '3', driverName: 'Driver 3', phoneNumber: '789' },
          assignedVehicle: { vehicleId: '3', licensePlate: 'GHI789', vehicleType: 'Xe 16 chỗ', capacity: 16 },
          thuTu: 9
        }
      ];

      // Act - Use reflection to access private method
      const sortMethod = (service as any).sortStationAssignmentsByRouteOrder;
      const sortedAssignments = await sortMethod.call(service, mockAssignments);

      // Assert
      expect(sortedAssignments[0].stationName).toBe('Ngã 3 Bến Gỗ'); // thuTu: 1
      expect(sortedAssignments[1].stationName).toBe('Ngã 4 Thủ Đức'); // thuTu: 3
      expect(sortedAssignments[2].stationName).toBe('BV Hòa Hảo'); // thuTu: 9
    });

    it('should sort stations by route details when thuTu field is not available', async () => {
      // Arrange
      const mockAssignments: StationAssignment[] = [
        {
          stationId: '1',
          stationName: 'Ngã 4 Thủ Đức',
          routeCode: 'HCM01',
          routeName: 'Tuyến HCM01',
          employeeCount: 12,
          assignedAt: new Date(),
          assignedDriver: { driverId: '1', driverName: 'Driver 1', phoneNumber: '123' },
          assignedVehicle: { vehicleId: '1', licensePlate: 'ABC123', vehicleType: 'Xe 16 chỗ', capacity: 16 }
        },
        {
          stationId: '2',
          stationName: 'Ngã 3 Bến Gỗ',
          routeCode: 'HCM01',
          routeName: 'Tuyến HCM01',
          employeeCount: 5,
          assignedAt: new Date(),
          assignedDriver: { driverId: '2', driverName: 'Driver 2', phoneNumber: '456' },
          assignedVehicle: { vehicleId: '2', licensePlate: 'DEF456', vehicleType: 'Xe 7 chỗ', capacity: 7 }
        }
      ];

      const mockRouteDetails = [
        { maTuyenXe: 'HCM01', tenDiemDon: 'Ngã 3 Bến Gỗ', thuTu: 1 },
        { maTuyenXe: 'HCM01', tenDiemDon: 'Ngã 4 Thủ Đức', thuTu: 3 }
      ];

      mockRouteDetailService.getRouteDetails.and.returnValue({
        toPromise: () => Promise.resolve(mockRouteDetails)
      } as any);

      // Act - Use reflection to access private method
      const sortMethod = (service as any).sortStationAssignmentsByRouteOrder;
      const sortedAssignments = await sortMethod.call(service, mockAssignments);

      // Assert
      expect(sortedAssignments[0].stationName).toBe('Ngã 3 Bến Gỗ'); // thuTu: 1
      expect(sortedAssignments[1].stationName).toBe('Ngã 4 Thủ Đức'); // thuTu: 3
    });

    it('should handle mixed route codes correctly', async () => {
      // Arrange
      const mockAssignments: StationAssignment[] = [
        {
          stationId: '1',
          stationName: 'Station A',
          routeCode: 'HCM02',
          routeName: 'Tuyến HCM02',
          employeeCount: 5,
          assignedAt: new Date(),
          assignedDriver: { driverId: '1', driverName: 'Driver 1', phoneNumber: '123' },
          assignedVehicle: { vehicleId: '1', licensePlate: 'ABC123', vehicleType: 'Xe 7 chỗ', capacity: 7 },
          thuTu: 1
        },
        {
          stationId: '2',
          stationName: 'Station B',
          routeCode: 'HCM01',
          routeName: 'Tuyến HCM01',
          employeeCount: 8,
          assignedAt: new Date(),
          assignedDriver: { driverId: '2', driverName: 'Driver 2', phoneNumber: '456' },
          assignedVehicle: { vehicleId: '2', licensePlate: 'DEF456', vehicleType: 'Xe 16 chỗ', capacity: 16 },
          thuTu: 2
        }
      ];

      // Act - Use reflection to access private method
      const sortMethod = (service as any).sortStationAssignmentsByRouteOrder;
      const sortedAssignments = await sortMethod.call(service, mockAssignments);

      // Assert - Should be sorted by route code first, then by thuTu
      expect(sortedAssignments[0].routeCode).toBe('HCM01');
      expect(sortedAssignments[1].routeCode).toBe('HCM02');
    });
  });
});
