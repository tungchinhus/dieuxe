import { Component } from '@angular/core';

/**
 * Test example để verify logic phân chia đều HCM01 và HCM02
 * 
 * Logic mới:
 * 1. Gom tất cả nhân viên HCM01 và HCM02 thành một danh sách chung
 * 2. Dùng vòng lặp tuần tự gán nhân viên cho HCM01 và HCM02
 * 3. Không quan tâm đến mã tuyến ban đầu
 * 4. Khi một tuyến đủ 15 người thì chuyển sang tuyến tiếp theo
 */
@Component({
  selector: 'app-hcm-even-distribution-test',
  template: `
    <div class="test-container">
      <h2>Test Logic Phân Chia Đều HCM01 và HCM02</h2>
      
      <div class="test-scenarios">
        <h3>Scenario 1: HCM01 có 7 nhân viên, HCM02 có 16 nhân viên (Tổng: 23)</h3>
        <div class="scenario-result">
          <p><strong>Kết quả mong đợi:</strong></p>
          <ul>
            <li>HCM01: 15 nhân viên (7 từ HCM01 ban đầu + 8 từ HCM02)</li>
            <li>HCM02: 8 nhân viên (8 nhân viên còn lại từ HCM02)</li>
            <li>Logic: Gom 23 nhân viên, gán tuần tự cho HCM01 (15) rồi HCM02 (8)</li>
          </ul>
        </div>

        <h3>Scenario 2: HCM01 có 5 nhân viên, HCM02 có 20 nhân viên (Tổng: 25)</h3>
        <div class="scenario-result">
          <p><strong>Kết quả mong đợi:</strong></p>
          <ul>
            <li>HCM01: 15 nhân viên (5 từ HCM01 ban đầu + 10 từ HCM02)</li>
            <li>HCM02: 10 nhân viên (10 nhân viên còn lại từ HCM02)</li>
            <li>Logic: Gom 25 nhân viên, gán tuần tự cho HCM01 (15) rồi HCM02 (10)</li>
          </ul>
        </div>

        <h3>Scenario 3: HCM01 có 10 nhân viên, HCM02 có 10 nhân viên (Tổng: 20)</h3>
        <div class="scenario-result">
          <p><strong>Kết quả mong đợi:</strong></p>
          <ul>
            <li>HCM01: 15 nhân viên (10 từ HCM01 ban đầu + 5 từ HCM02)</li>
            <li>HCM02: 5 nhân viên (5 nhân viên còn lại từ HCM02)</li>
            <li>Logic: Gom 20 nhân viên, gán tuần tự cho HCM01 (15) rồi HCM02 (5)</li>
          </ul>
        </div>

        <h3>Scenario 4: HCM01 có 8 nhân viên, HCM02 có 8 nhân viên (Tổng: 16)</h3>
        <div class="scenario-result">
          <p><strong>Kết quả mong đợi:</strong></p>
          <ul>
            <li>HCM01: 15 nhân viên (8 từ HCM01 ban đầu + 7 từ HCM02)</li>
            <li>HCM02: 1 nhân viên (1 nhân viên còn lại từ HCM02)</li>
            <li>Logic: Gom 16 nhân viên, gán tuần tự cho HCM01 (15) rồi HCM02 (1)</li>
          </ul>
        </div>

        <h3>Scenario 5: HCM01 có 12 nhân viên, HCM02 có 12 nhân viên (Tổng: 24)</h3>
        <div class="scenario-result">
          <p><strong>Kết quả mong đợi:</strong></p>
          <ul>
            <li>HCM01: 15 nhân viên (12 từ HCM01 ban đầu + 3 từ HCM02)</li>
            <li>HCM02: 9 nhân viên (9 nhân viên còn lại từ HCM02)</li>
            <li>Logic: Gom 24 nhân viên, gán tuần tự cho HCM01 (15) rồi HCM02 (9)</li>
          </ul>
        </div>
      </div>

      <div class="implementation-notes">
        <h3>Implementation Notes:</h3>
        <ul>
          <li><strong>Method mới:</strong> <code>distributeHCMEmployeesEvenlyForDialog()</code></li>
          <li><strong>Logic chính:</strong> Gom tất cả nhân viên HCM01 và HCM02 thành một danh sách chung</li>
          <li><strong>Vòng lặp:</strong> Gán tuần tự cho HCM01 trước, khi đủ 15 thì chuyển sang HCM02</li>
          <li><strong>Không quan tâm:</strong> Mã tuyến ban đầu của nhân viên</li>
          <li><strong>Ưu điểm:</strong> Phân chia đều hơn, tránh tình trạng HCM01 thiếu trong khi HCM02 thừa</li>
        </ul>
      </div>

      <div class="code-example">
        <h3>Code Example:</h3>
        <pre><code>
// Logic cũ (có vấn đề):
// HCM01: 7 nhân viên (thiếu 8)
// HCM02: 16 nhân viên (thừa 1)

// Logic mới (đã sửa):
// Gom: 23 nhân viên từ cả HCM01 và HCM02
// Gán tuần tự:
// - HCM01: 15 nhân viên đầu tiên
// - HCM02: 8 nhân viên còn lại
// Kết quả: HCM01 đủ 15, HCM02 có 8 (phân chia đều hơn)
        </code></pre>
      </div>
    </div>
  `,
  styles: [`
    .test-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .test-scenarios {
      margin: 20px 0;
    }

    .scenario-result {
      background-color: #f5f5f5;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
      border-left: 4px solid #2196F3;
    }

    .scenario-result ul {
      margin: 10px 0;
      padding-left: 20px;
    }

    .scenario-result li {
      margin: 5px 0;
    }

    .implementation-notes {
      background-color: #e8f5e8;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
      border-left: 4px solid #4CAF50;
    }

    .code-example {
      background-color: #f9f9f9;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
      border-left: 4px solid #FF9800;
    }

    .code-example pre {
      background-color: #2d3748;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }

    h2 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }

    h3 {
      color: #34495e;
      margin-top: 20px;
    }

    strong {
      color: #e74c3c;
    }

    code {
      background-color: #f1f2f6;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  `]
})
export class HCMEvenDistributionTestExample {
  constructor() {
    console.log('HCM Even Distribution Test Example loaded');
    console.log('This example demonstrates the new even distribution logic for HCM01 and HCM02 routes');
  }
}
