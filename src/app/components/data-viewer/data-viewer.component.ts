import { Component, OnInit } from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="data-viewer">
      <h2>Firebase Data Viewer</h2>
      
      <div class="collection-section">
        <h3>Xe Dua Don</h3>
        <div *ngIf="xeDuaDonData.length === 0" class="no-data">Không có dữ liệu</div>
        <div *ngFor="let item of xeDuaDonData" class="data-item">
          <pre>{{ item | json }}</pre>
        </div>
      </div>

      <div class="collection-section">
        <h3>Lich Trinh Xe</h3>
        <div *ngIf="lichTrinhXeData.length === 0" class="no-data">Không có dữ liệu</div>
        <div *ngFor="let item of lichTrinhXeData" class="data-item">
          <pre>{{ item | json }}</pre>
        </div>
      </div>

      <div class="collection-section">
        <h3>Chi Tiet Tuyen Duong</h3>
        <div *ngIf="chiTietTuyenDuongData.length === 0" class="no-data">Không có dữ liệu</div>
        <div *ngFor="let item of chiTietTuyenDuongData" class="data-item">
          <pre>{{ item | json }}</pre>
        </div>
      </div>

      <div class="collection-section">
        <h3>Dang Ky Phan Xe</h3>
        <div *ngIf="dangKyPhanXeData.length === 0" class="no-data">Không có dữ liệu</div>
        <div *ngFor="let item of dangKyPhanXeData" class="data-item">
          <pre>{{ item | json }}</pre>
        </div>
      </div>

      <button (click)="refreshData()" class="refresh-btn">Refresh Data</button>
    </div>
  `,
  styles: [`
    .data-viewer {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .collection-section {
      margin-bottom: 30px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: #f9f9f9;
    }

    .collection-section h3 {
      color: #1976d2;
      margin-bottom: 15px;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 5px;
    }

    .data-item {
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 10px;
    }

    .data-item pre {
      margin: 0;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .no-data {
      color: #666;
      font-style: italic;
      text-align: center;
      padding: 20px;
    }

    .refresh-btn {
      background: #1976d2;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }

    .refresh-btn:hover {
      background: #1565c0;
    }
  `]
})
export class DataViewerComponent implements OnInit {
  xeDuaDonData: any[] = [];
  lichTrinhXeData: any[] = [];
  chiTietTuyenDuongData: any[] = [];
  dangKyPhanXeData: any[] = [];

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit() {
    this.loadAllData();
  }

  async loadAllData() {
    try {
      console.log('Loading data from Firebase...');
      
      // Load xeDuaDon data
      this.xeDuaDonData = await this.firestoreService.getAllXeDuaDon();
      console.log('xeDuaDon data:', this.xeDuaDonData);
      
      // Load lichTrinhXe data
      this.lichTrinhXeData = await this.firestoreService.getAllLichTrinhXe();
      console.log('lichTrinhXe data:', this.lichTrinhXeData);
      
      // Load chiTietTuyenDuong data
      this.chiTietTuyenDuongData = await this.firestoreService.getAllChiTietTuyenDuong();
      console.log('chiTietTuyenDuong data:', this.chiTietTuyenDuongData);
      
      // Load dangKyPhanXe data
      this.dangKyPhanXeData = await this.firestoreService.getAllDangKyPhanXe();
      console.log('dangKyPhanXe data:', this.dangKyPhanXeData);
      
      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Lỗi khi tải dữ liệu: ' + error);
    }
  }

  refreshData() {
    this.loadAllData();
  }
}
