import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Registration } from '../models/registration.model';
import { PhuTroiVehicleRouteSortService } from './phu-troi-vehicle-route-sort.service';
import { PhuTroiVehiclePackingService } from './phu-troi-vehicle-packing.service';
import {
  Employee,
  FinalAssignment,
  PhuTroiVehicleRouteAssignmentService,
  RouteDefinition,
  VehicleConfig,
} from './phu-troi-vehicle-route-assignment.service';

/** Snapshot từ dialog phân công — tách biệt interface, không import từ PdfExportService. */
export interface PhuTroiDialogAssignment {
  routeCode: string;
  routeName: string;
  assignedVehicle: {
    licensePlate: string;
    vehicleId?: string;
    vehicleType?: string;
  };
  assignedDriver: {
    driverName: string;
    phoneNumber: string;
  };
}

export interface PhuTroiRouteGroupRow {
  routeName: string;
  registrations: Registration[];
}

export interface PhuTroiVehicleRoutePdfParams {
  routeGroups: PhuTroiRouteGroupRow[];
  assignments: PhuTroiDialogAssignment[];
  selectedDate: Date;
}

export interface PhuTroiAutoAssignmentParams {
  employees: Employee[];
  vehicles: VehicleConfig[];
  routeDefinitions?: RouteDefinition[];
}

interface VehicleSheetPayload {
  plateDisplay: string;
  driverName: string;
  driverPhone: string;
  routeCodesLabel: string;
  sorted: Registration[];
  stationsFooter: string[];
}

@Injectable({ providedIn: 'root' })
export class PhuTroiVehicleRoutePdfService {
  private readonly rowsPerPage = 18;

  constructor(
    private sortService: PhuTroiVehicleRouteSortService,
    private assignmentService: PhuTroiVehicleRouteAssignmentService,
    private packingService: PhuTroiVehiclePackingService
  ) {}

  /**
   * New flow helper:
   * Build route/vehicle assignments from raw employees + vehicle configs.
   * Caller can render this output directly to PDF sections.
   */
  buildAutoAssignments(params: PhuTroiAutoAssignmentParams): FinalAssignment[] {
    return this.assignmentService.assignOvertimeRoutes(
      params.employees,
      params.vehicles,
      params.routeDefinitions
    );
  }

  async exportVehicleRouteOrderedPdf(params: PhuTroiVehicleRoutePdfParams): Promise<void> {
    const { routeGroups, assignments, selectedDate } = params;
    const sheets = this.buildVehicleSheets(routeGroups, assignments);
    if (sheets.length === 0) {
      alert('Không có nhân viên nào (hoặc chưa gán biển số xe) để xuất PDF sắp theo lộ trình.');
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setProperties({
      title: 'Phiếu báo làm thêm giờ — sắp theo lộ trình xe',
      subject: 'Phụ trời — thứ tự trạm dọc đường',
      author: 'Thibidi System',
      creator: 'Thibidi System',
    });

    for (let i = 0; i < sheets.length; i++) {
      if (i > 0) pdf.addPage();
      await this.appendVehicleToPdf(pdf, sheets[i], selectedDate);
    }

    const d = selectedDate;
    const fn = `PHIEU_PT_LO_TRINH_XE_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.pdf`;
    pdf.save(fn);
  }

  private normalizePlateKey(plate: string): string {
    if (!plate) return '';
    const p = plate.replace(/^\d{2}[A-Za-z]\s*-\s*/i, '').replace(/\s+/g, '').toUpperCase();
    return p;
  }

  /**
   * Xếp theo xe: cùng trạm đi chung xe, xếp lần lượt theo thứ tự trạm với sức chứa từng xe
   * (đối chiếu PDF "DS PHỤ TRỘI 03.11"). Chưa gán biển số nào thì dùng cách cũ theo từng tuyến.
   */
  private buildVehicleSheets(
    routeGroups: PhuTroiRouteGroupRow[],
    assignments: PhuTroiDialogAssignment[]
  ): VehicleSheetPayload[] {
    const loads = this.packingService.planFromAssignments(routeGroups, assignments);
    if (loads.length === 0) {
      return this.buildSheetsPerPlate(routeGroups, assignments);
    }
    return loads.map(load => ({
      plateDisplay: load.plateDisplay,
      driverName: load.driverName,
      driverPhone: load.driverPhone,
      routeCodesLabel: load.routeLabel,
      sorted: load.registrations,
      stationsFooter: this.sortService.uniqueStationsInOrder(load.registrations),
    }));
  }

  private buildSheetsPerPlate(
    routeGroups: PhuTroiRouteGroupRow[],
    assignments: PhuTroiDialogAssignment[]
  ): VehicleSheetPayload[] {
    const byPlate = new Map<
      string,
      { regs: Registration[]; routes: Set<string>; plateDisplay: string; driverName: string; driverPhone: string }
    >();

    for (const group of routeGroups) {
      if (!group.registrations?.length) continue;
      if (group.routeName === 'TỰ TÚC') continue;

      const asg = assignments.find(a => a.routeCode === group.routeName);
      if (!asg?.assignedVehicle?.licensePlate?.trim()) continue;

      const key = this.normalizePlateKey(asg.assignedVehicle.licensePlate);
      if (!key) continue;

      let bucket = byPlate.get(key);
      if (!bucket) {
        bucket = {
          regs: [],
          routes: new Set<string>(),
          plateDisplay: asg.assignedVehicle.licensePlate.trim(),
          driverName: (asg.assignedDriver?.driverName || '').trim(),
          driverPhone: (asg.assignedDriver?.phoneNumber || '').trim(),
        };
        byPlate.set(key, bucket);
      } else {
        if (!bucket.driverName && asg.assignedDriver?.driverName) {
          bucket.driverName = asg.assignedDriver.driverName.trim();
        }
        if (!bucket.driverPhone && asg.assignedDriver?.phoneNumber) {
          bucket.driverPhone = asg.assignedDriver.phoneNumber.trim();
        }
      }

      bucket.routes.add(group.routeName);
      bucket.regs.push(...group.registrations);
    }

    const sheets: VehicleSheetPayload[] = [];
    for (const b of byPlate.values()) {
      const sorted = this.sortService.sortRegistrations(b.regs);
      const stationsFooter = this.sortService.uniqueStationsInOrder(sorted);
      const routeCodesLabel = [...b.routes].sort().join(', ');
      sheets.push({
        plateDisplay: b.plateDisplay,
        driverName: b.driverName,
        driverPhone: b.driverPhone,
        routeCodesLabel,
        sorted,
        stationsFooter,
      });
    }

    sheets.sort((a, b) => a.plateDisplay.localeCompare(b.plateDisplay, 'vi'));
    return sheets;
  }

  private async appendVehicleToPdf(pdf: jsPDF, sheet: VehicleSheetPayload, selectedDate: Date): Promise<void> {
    const chunks: Registration[][] = [];
    for (let i = 0; i < sheet.sorted.length; i += this.rowsPerPage) {
      chunks.push(sheet.sorted.slice(i, i + this.rowsPerPage));
    }
    if (chunks.length === 0) chunks.push([]);

    for (let p = 0; p < chunks.length; p++) {
      if (p > 0) pdf.addPage();
      const html = this.buildHtmlPage(sheet, chunks[p], selectedDate, p + 1, chunks.length);
      await this.htmlFragmentToPdfPage(pdf, html);
    }
  }

  private buildHtmlPage(
    sheet: VehicleSheetPayload,
    pageRegs: Registration[],
    selectedDate: Date,
    pageIndex: number,
    totalPages: number
  ): string {
    const dateStr = `Ngày ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`;
    const sub =
      totalPages > 1 ? ` <span style="font-size:11px">(trang ${pageIndex}/${totalPages})</span>` : '';
    const sttStart = (pageIndex - 1) * this.rowsPerPage;
    const rows = pageRegs
      .map((r, idx) => {
        const stt = sttStart + idx + 1;
        return `<tr>
          <td style="border:1px solid #333;padding:4px 6px;text-align:center">${stt}</td>
          <td style="border:1px solid #333;padding:4px 6px">${this.esc(r.hoTen)}</td>
          <td style="border:1px solid #333;padding:4px 6px">${this.esc(r.tramXe)}</td>
          <td style="border:1px solid #333;padding:4px 6px">${this.esc(r.dienThoai)}</td>
          <td style="border:1px solid #333;padding:4px 6px;text-align:center">${this.esc(r.thoiGianBatDau || '15:45')}</td>
          <td style="border:1px solid #333;padding:4px 6px;text-align:center">${this.esc(r.thoiGianKetThuc || '19:00')}</td>
        </tr>`;
      })
      .join('');

    const tuyenLine = `TUYẾN: ${this.esc(sheet.routeCodesLabel)} | Tài xế: ${this.esc(sheet.driverName)} | SĐT: ${this.esc(sheet.driverPhone)} | Xe: ${this.esc(sheet.plateDisplay)}`;
    const footerStations = sheet.stationsFooter.map(s => this.esc(s)).join(' · ');

    return `<div class="wrap" style="font-family:'Times New Roman',Times,serif;font-size:12px;color:#000;padding:8mm">
      <div style="text-align:center;font-weight:bold;font-size:14px;margin-bottom:6px">PHIẾU BÁO LÀM THÊM GIỜ${sub}</div>
      <div style="text-align:center;margin-bottom:10px">${this.esc(dateStr)}</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
        <thead>
          <tr style="font-weight:bold">
            <th style="border:1px solid #333;padding:4px 6px;width:36px">STT</th>
            <th style="border:1px solid #333;padding:4px 6px">Họ và tên</th>
            <th style="border:1px solid #333;padding:4px 6px">Trạm xe</th>
            <th style="border:1px solid #333;padding:4px 6px">Điện thoại</th>
            <th style="border:1px solid #333;padding:4px 6px;width:52px">Từ...</th>
            <th style="border:1px solid #333;padding:4px 6px;width:52px">Đến...</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="font-size:11px;margin-top:4px;line-height:1.35">${tuyenLine}</div>
      <div style="font-size:11px;margin-top:6px;color:#222">${footerStations}</div>
    </div>`;
  }

  private esc(s: string): string {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  private async htmlFragmentToPdfPage(pdf: jsPDF, htmlContent: string): Promise<void> {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '210mm';
    tempDiv.style.fontSize = '12px';
    document.body.appendChild(tempDiv);
    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 794,
        height: 1123,
      });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    } finally {
      document.body.removeChild(tempDiv);
    }
  }
}
