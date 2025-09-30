import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AiLogicService } from '../../services/ai-logic.service';

@Component({
  selector: 'app-ai-demo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './ai-demo.component.html',
  styleUrls: ['./ai-demo.component.css']
})
export class AiDemoComponent implements OnInit {
  aiForm: FormGroup;
  isLoading = false;
  aiResponse: any = null;
  selectedFunction = 'analyzeVehicle';

  constructor(
    private fb: FormBuilder,
    private aiService: AiLogicService,
    private snackBar: MatSnackBar
  ) {
    this.aiForm = this.fb.group({
      inputData: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadSampleData();
  }

  loadSampleData(): void {
    const sampleData = {
      analyzeVehicle: JSON.stringify({
        vehicleId: "X001",
        type: "Xe đưa đón",
        capacity: 30,
        currentLocation: "Trung tâm thành phố",
        maintenanceHistory: ["2024-01-15: Thay dầu", "2024-03-20: Kiểm tra phanh"],
        fuelEfficiency: 8.5,
        driverExperience: 5
      }, null, 2),
      optimizeRoute: JSON.stringify({
        routes: [
          { id: "R001", start: "Điểm A", end: "Điểm B", distance: 15, traffic: "Cao" },
          { id: "R002", start: "Điểm B", end: "Điểm C", distance: 20, traffic: "Thấp" }
        ],
        vehicles: [
          { id: "V001", capacity: 30, currentLocation: "Điểm A" },
          { id: "V002", capacity: 25, currentLocation: "Điểm B" }
        ]
      }, null, 2),
      predictDemand: JSON.stringify({
        historicalData: {
          "2024-01": { passengers: 1200, routes: 15 },
          "2024-02": { passengers: 1350, routes: 18 },
          "2024-03": { passengers: 1100, routes: 12 }
        },
        currentMonth: "2024-04",
        weather: "Mưa",
        events: ["Lễ hội", "Hội nghị"]
      }, null, 2)
    };

    this.aiForm.patchValue({
      inputData: sampleData[this.selectedFunction as keyof typeof sampleData] || ''
    });
  }

  onFunctionChange(): void {
    this.loadSampleData();
    this.aiResponse = null;
  }

  async callAiFunction(): Promise<void> {
    if (this.aiForm.invalid) {
      this.snackBar.open('Vui lòng nhập dữ liệu hợp lệ', 'Đóng', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.aiResponse = null;

    try {
      const inputData = JSON.parse(this.aiForm.value.inputData);
      let result: any;

      // Simulate AI processing with mock data
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

      switch (this.selectedFunction) {
        case 'analyzeVehicle':
          result = this.mockAnalyzeVehicle(inputData);
          break;
        case 'optimizeRoute':
          result = this.mockOptimizeRoute(inputData);
          break;
        case 'predictDemand':
          result = this.mockPredictDemand(inputData);
          break;
        case 'analyzeEmployee':
          result = this.mockAnalyzeEmployee(inputData);
          break;
        case 'generateReport':
          result = this.mockGenerateReport(inputData);
          break;
        case 'getImprovements':
          result = this.mockGetImprovements(inputData);
          break;
        default:
          throw new Error('Chức năng không được hỗ trợ');
      }

      this.aiResponse = result;
      this.snackBar.open('AI đã xử lý thành công! (Demo Mode)', 'Đóng', { duration: 3000 });
    } catch (error: any) {
      console.error('Lỗi khi gọi AI:', error);
      this.snackBar.open(`Lỗi: ${error.message || 'Có lỗi xảy ra'}`, 'Đóng', { duration: 5000 });
    } finally {
      this.isLoading = false;
    }
  }

  // Mock AI functions for demo
  private mockAnalyzeVehicle(data: any): any {
    return {
      success: true,
      data: {
        vehicleId: data.vehicleId || 'X001',
        analysisDate: new Date().toISOString(),
        recommendations: [
          'Hiệu suất nhiên liệu tốt',
          'Cần kiểm tra phanh định kỳ',
          'Lịch bảo trì được duy trì tốt'
        ],
        performanceScore: 85,
        maintenanceScore: 90,
        efficiencyScore: 80,
        overallScore: 85
      },
      message: 'Phân tích dữ liệu xe hoàn tất (Demo)'
    };
  }

  private mockOptimizeRoute(data: any): any {
    return {
      success: true,
      data: {
        optimizedRoutes: [
          {
            id: 'R001',
            start: 'Điểm A',
            end: 'Điểm B',
            priority: 85,
            assignedVehicles: [{ id: 'V001', capacity: 30 }],
            estimatedTime: 25,
            efficiency: 85
          }
        ],
        totalRoutes: 1,
        totalVehicles: 1,
        efficiency: 85
      },
      message: 'Tối ưu hóa tuyến đường hoàn tất (Demo)'
    };
  }

  private mockPredictDemand(data: any): any {
    return {
      success: true,
      data: {
        currentMonth: {
          month: '2024-04',
          predictedPassengers: 1200,
          predictedRoutes: 15,
          confidence: 0.8
        },
        futurePredictions: [
          {
            month: '2024-05',
            predictedPassengers: 1250,
            predictedRoutes: 16,
            confidence: 0.7
          }
        ]
      },
      message: 'Dự đoán nhu cầu hoàn tất (Demo)'
    };
  }

  private mockAnalyzeEmployee(data: any): any {
    return {
      success: true,
      data: {
        employeeId: data.employeeId || 'E001',
        name: data.name || 'Nguyễn Văn A',
        position: data.position || 'Tài xế',
        analysisDate: new Date().toISOString(),
        scores: {
          productivity: 85,
          attendance: 90,
          customerSatisfaction: 80,
          overall: 85
        },
        recommendations: [
          'Năng suất làm việc tốt',
          'Chuyên cần xuất sắc',
          'Cần cải thiện dịch vụ khách hàng'
        ]
      },
      message: 'Phân tích hiệu suất nhân viên hoàn tất (Demo)'
    };
  }

  private mockGenerateReport(data: any): any {
    return {
      success: true,
      data: {
        reportId: `RPT_${Date.now()}`,
        reportType: data.reportType || 'vehicle_performance',
        generatedAt: new Date().toISOString(),
        summary: {
          totalVehicles: 25,
          activeVehicles: 23,
          maintenanceRequired: 2,
          averageEfficiency: 85
        },
        insights: [
          'Hiệu suất xe trung bình đạt 85%',
          '2 xe cần bảo trì khẩn cấp',
          'Tỷ lệ sử dụng xe đạt 92%'
        ],
        recommendations: [
          'Tiếp tục duy trì các hoạt động hiện tại',
          'Tăng cường đào tạo cho nhân viên mới'
        ]
      },
      message: 'Báo cáo thông minh đã được tạo (Demo)'
    };
  }

  private mockGetImprovements(data: any): any {
    return {
      success: true,
      data: {
        analysisDate: new Date().toISOString(),
        priority: 'high',
        categories: {
          technical: [
            {
              title: 'Nâng cấp hệ thống AI',
              description: 'Tích hợp thêm các mô hình AI tiên tiến',
              impact: 'Tăng độ chính xác dự đoán lên 15%',
              effort: 'Medium',
              cost: 'Medium'
            }
          ],
          operational: [
            {
              title: 'Tự động hóa báo cáo',
              description: 'Tự động tạo và gửi báo cáo hàng ngày',
              impact: 'Tiết kiệm 2 giờ làm việc mỗi ngày',
              effort: 'Medium',
              cost: 'Low'
            }
          ],
          strategic: [
            {
              title: 'Mở rộng tích hợp AI',
              description: 'Áp dụng AI cho nhiều module khác',
              impact: 'Tăng 40% hiệu quả tổng thể',
              effort: 'High',
              cost: 'High'
            }
          ]
        }
      },
      message: 'Đề xuất cải thiện hệ thống đã được tạo (Demo)'
    };
  }

  getFunctionDescription(): string {
    const descriptions: { [key: string]: string } = {
      analyzeVehicle: 'Phân tích dữ liệu xe và đưa ra đề xuất tối ưu hóa',
      optimizeRoute: 'Tối ưu hóa tuyến đường dựa trên dữ liệu giao thông và xe',
      predictDemand: 'Dự đoán nhu cầu vận chuyển trong tương lai',
      analyzeEmployee: 'Phân tích hiệu suất làm việc của nhân viên',
      generateReport: 'Tạo báo cáo thông minh từ dữ liệu hệ thống',
      getImprovements: 'Đề xuất cải thiện hệ thống dựa trên phân tích AI'
    };
    return descriptions[this.selectedFunction] || '';
  }
}
