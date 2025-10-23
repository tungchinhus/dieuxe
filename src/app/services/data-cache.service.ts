import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { RouteDetailService } from './route-detail.service';
import { StationRouteMappingService } from './station-route-mapping.service';
import { RouteDetail } from '../models/route-detail.model';

export interface StationRouteMapping {
  stationName: string;
  routeCode: string;
  order: number;
}

export interface RouteStationOrder {
  routeCode: string;
  stations: Map<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class DataCacheService {
  private routeDetailsCache: RouteDetail[] = [];
  private stationRouteMappingCache: Map<string, string> = new Map();
  private routeStationOrderCache: Map<string, Map<string, number>> = new Map();
  private isLoaded = false;
  private isLoading = false;

  constructor(
    private routeDetailService: RouteDetailService,
    private stationRouteMappingService: StationRouteMappingService
  ) {}

  /**
   * Load tất cả dữ liệu từ database một lần duy nhất
   */
  async loadAllData(): Promise<void> {
    if (this.isLoaded || this.isLoading) {
      return;
    }

    this.isLoading = true;
    console.log('DataCache - Loading all data from database...');

    try {
      // Load route details
      this.routeDetailsCache = await firstValueFrom(this.routeDetailService.getRouteDetails());
      console.log('DataCache - Route details loaded:', this.routeDetailsCache.length);
      console.log('DataCache - Route details data:', this.routeDetailsCache);
      
      // Log all unique routes
      const uniqueRoutes = [...new Set(this.routeDetailsCache.map(detail => detail.maTuyenXe))];
      console.log('DataCache - Unique routes found:', uniqueRoutes);

      // Load station route mapping
      console.log('DataCache - Loading station route mapping...');
      await this.stationRouteMappingService.loadStationRouteMapping();
      console.log('DataCache - Station route mapping service loaded');
      
      // Get station route mapping from service
      const stationRouteMap = this.stationRouteMappingService.getStationRouteMap();
      this.stationRouteMappingCache = stationRouteMap;
      console.log('DataCache - Station route mapping loaded:', this.stationRouteMappingCache.size);
      
      // Log some sample mappings for debugging
      const sampleStations = ['bà chiểu', 'ngã 4 thủ đức', 'chợ gò vấp', 'ngã 3 bến gỗ', 'bv 7b', 'ngã 4 vũng tàu'];
      sampleStations.forEach(station => {
        const route = this.stationRouteMappingCache.get(station) || this.stationRouteMappingCache.get(station.toLowerCase());
        console.log(`DataCache - Station "${station}" maps to route:`, route || 'NOT FOUND');
      });
      
      // Log tất cả mappings trong cache để debug
      console.log('DataCache - All cached mappings:');
      this.stationRouteMappingCache.forEach((route, station) => {
        console.log(`  "${station}" -> "${route}"`);
      });

      // Build route station order cache
      this.buildRouteStationOrderCache();
      console.log('DataCache - Route station order cache built:', this.routeStationOrderCache.size);

      this.isLoaded = true;
      this.isLoading = false;
      console.log('DataCache - All data loaded successfully');

    } catch (error) {
      console.error('DataCache - Error loading data:', error);
      this.isLoading = false;
      throw error;
    }
  }

  /**
   * Build route station order cache từ route details
   */
  private buildRouteStationOrderCache(): void {
    this.routeStationOrderCache.clear();

    this.routeDetailsCache.forEach(detail => {
      if (!this.routeStationOrderCache.has(detail.maTuyenXe)) {
        this.routeStationOrderCache.set(detail.maTuyenXe, new Map());
      }

      const routeMap = this.routeStationOrderCache.get(detail.maTuyenXe)!;
      routeMap.set(detail.tenDiemDon, detail.thuTu);
      routeMap.set(this.normalizeStationName(detail.tenDiemDon), detail.thuTu);
    });
  }

  /**
   * Get route for station từ cache
   */
  getRouteForStation(stationName: string): string | null {
    if (!this.isLoaded) {
      console.warn('DataCache - Data not loaded yet, call loadAllData() first');
      return null;
    }

    // Try exact match first
    let route = this.stationRouteMappingCache.get(stationName);
    if (route) {
      console.log(`DataCache - Found exact match for "${stationName}" -> "${route}"`);
      return route;
    }

    // Try normalized match
    const normalizedStation = this.normalizeStationName(stationName);
    route = this.stationRouteMappingCache.get(normalizedStation);
    if (route) {
      console.log(`DataCache - Found normalized match for "${stationName}" (normalized: "${normalizedStation}") -> "${route}"`);
      return route;
    }

    // Try lowercase match
    route = this.stationRouteMappingCache.get(stationName.toLowerCase());
    if (route) {
      console.log(`DataCache - Found lowercase match for "${stationName}" -> "${route}"`);
      return route;
    }

    console.warn(`DataCache - No route mapping found for station "${stationName}" (tried: "${stationName}", "${normalizedStation}", "${stationName.toLowerCase()}")`);
    return null;
  }

  /**
   * Get station order trong route từ cache
   */
  getStationOrderInRoute(routeCode: string, stationName: string): number | null {
    if (!this.isLoaded) {
      console.warn('DataCache - Data not loaded yet, call loadAllData() first');
      return null;
    }

    const routeMap = this.routeStationOrderCache.get(routeCode);
    if (!routeMap) {
      return null;
    }

    return routeMap.get(stationName) || routeMap.get(this.normalizeStationName(stationName)) || null;
  }

  /**
   * Get all route details từ cache
   */
  getRouteDetails(): RouteDetail[] {
    if (!this.isLoaded) {
      console.warn('DataCache - Data not loaded yet, call loadAllData() first');
      return [];
    }

    return [...this.routeDetailsCache];
  }

  /**
   * Get all routes từ cache
   */
  getAllRoutes(): string[] {
    if (!this.isLoaded) {
      console.warn('DataCache - Data not loaded yet, call loadAllData() first');
      return [];
    }

    return Array.from(new Set(this.routeDetailsCache.map(detail => detail.maTuyenXe)));
  }

  /**
   * Get stations for route từ cache
   */
  getStationsForRoute(routeCode: string): string[] {
    if (!this.isLoaded) {
      console.warn('DataCache - Data not loaded yet, call loadAllData() first');
      return [];
    }

    return this.routeDetailsCache
      .filter(detail => detail.maTuyenXe === routeCode)
      .map(detail => detail.tenDiemDon);
  }

  /**
   * Check if data is loaded
   */
  isDataLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Clear cache (for testing or refresh)
   */
  clearCache(): void {
    this.routeDetailsCache = [];
    this.stationRouteMappingCache.clear();
    this.routeStationOrderCache.clear();
    this.isLoaded = false;
    this.isLoading = false;
    console.log('DataCache - Cache cleared');
  }

  /**
   * Normalize station name for better matching
   */
  private normalizeStationName(stationName: string): string {
    if (!stationName) return '';
    
    return stationName
      .toLowerCase()
      .trim()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
