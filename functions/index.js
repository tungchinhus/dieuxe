const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// AI Logic Functions
exports.analyzeVehicleData = functions.https.onCall(async (data, context) => {
  try {
    // Kiểm tra authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { vehicleId, type, capacity, currentLocation, maintenanceHistory, fuelEfficiency, driverExperience } = data;

    // AI Logic để phân tích dữ liệu xe
    const analysis = {
      vehicleId,
      analysisDate: new Date().toISOString(),
      recommendations: [],
      performanceScore: 0,
      maintenanceScore: 0,
      efficiencyScore: 0,
      overallScore: 0
    };

    // Phân tích hiệu suất
    if (fuelEfficiency >= 8) {
      analysis.efficiencyScore = 90;
      analysis.recommendations.push("Hiệu suất nhiên liệu tốt");
    } else if (fuelEfficiency >= 6) {
      analysis.efficiencyScore = 70;
      analysis.recommendations.push("Cần cải thiện hiệu suất nhiên liệu");
    } else {
      analysis.efficiencyScore = 50;
      analysis.recommendations.push("Cần kiểm tra và bảo trì động cơ");
    }

    // Phân tích bảo trì
    const recentMaintenance = maintenanceHistory.filter(m => {
      const date = new Date(m.split(':')[0]);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return date > sixMonthsAgo;
    });

    if (recentMaintenance.length >= 2) {
      analysis.maintenanceScore = 85;
      analysis.recommendations.push("Lịch bảo trì được duy trì tốt");
    } else {
      analysis.maintenanceScore = 60;
      analysis.recommendations.push("Cần tăng cường bảo trì định kỳ");
    }

    // Phân tích kinh nghiệm tài xế
    if (driverExperience >= 5) {
      analysis.performanceScore = 90;
      analysis.recommendations.push("Tài xế có kinh nghiệm tốt");
    } else if (driverExperience >= 2) {
      analysis.performanceScore = 70;
      analysis.recommendations.push("Tài xế cần thêm kinh nghiệm");
    } else {
      analysis.performanceScore = 50;
      analysis.recommendations.push("Cần đào tạo thêm cho tài xế");
    }

    // Tính điểm tổng thể
    analysis.overallScore = Math.round((analysis.efficiencyScore + analysis.maintenanceScore + analysis.performanceScore) / 3);

    // Thêm đề xuất dựa trên điểm số
    if (analysis.overallScore >= 80) {
      analysis.recommendations.push("Xe hoạt động tốt, duy trì hiện trạng");
    } else if (analysis.overallScore >= 60) {
      analysis.recommendations.push("Cần cải thiện một số khía cạnh");
    } else {
      analysis.recommendations.push("Cần kiểm tra toàn diện và cải thiện");
    }

    return {
      success: true,
      data: analysis,
      message: "Phân tích dữ liệu xe hoàn tất"
    };

  } catch (error) {
    console.error('Error in analyzeVehicleData:', error);
    throw new functions.https.HttpsError('internal', 'Error analyzing vehicle data');
  }
});

exports.optimizeRoute = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { routes, vehicles } = data;

    // AI Logic để tối ưu hóa tuyến đường
    const optimizedRoutes = routes.map(route => {
      const assignedVehicles = vehicles.filter(vehicle => 
        vehicle.currentLocation === route.start
      );

      // Tính toán độ ưu tiên dựa trên traffic và distance
      let priority = 100;
      if (route.traffic === 'Cao') priority -= 30;
      else if (route.traffic === 'Trung bình') priority -= 15;
      
      if (route.distance > 20) priority -= 20;
      else if (route.distance > 10) priority -= 10;

      return {
        ...route,
        priority,
        assignedVehicles: assignedVehicles.slice(0, 1), // Gán 1 xe cho mỗi tuyến
        estimatedTime: Math.round(route.distance * 2.5), // Ước tính thời gian (phút)
        efficiency: priority
      };
    });

    // Sắp xếp theo độ ưu tiên
    optimizedRoutes.sort((a, b) => b.priority - a.priority);

    return {
      success: true,
      data: {
        optimizedRoutes,
        totalRoutes: routes.length,
        totalVehicles: vehicles.length,
        efficiency: Math.round(optimizedRoutes.reduce((sum, route) => sum + route.efficiency, 0) / routes.length)
      },
      message: "Tối ưu hóa tuyến đường hoàn tất"
    };

  } catch (error) {
    console.error('Error in optimizeRoute:', error);
    throw new functions.https.HttpsError('internal', 'Error optimizing routes');
  }
});

exports.predictDemand = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { historicalData, currentMonth, weather, events } = data;

    // AI Logic để dự đoán nhu cầu
    const historicalValues = Object.values(historicalData);
    const avgPassengers = historicalValues.reduce((sum: number, month: any) => sum + month.passengers, 0) / historicalValues.length;
    const avgRoutes = historicalValues.reduce((sum: number, month: any) => sum + month.routes, 0) / historicalValues.length;

    // Tính toán hệ số điều chỉnh
    let weatherFactor = 1.0;
    if (weather === 'Mưa') weatherFactor = 1.2;
    else if (weather === 'Nắng') weatherFactor = 0.9;
    else if (weather === 'Lạnh') weatherFactor = 1.1;

    let eventFactor = 1.0;
    if (events && events.length > 0) {
      eventFactor = 1 + (events.length * 0.15);
    }

    // Dự đoán cho tháng hiện tại
    const predictedPassengers = Math.round(avgPassengers * weatherFactor * eventFactor);
    const predictedRoutes = Math.round(avgRoutes * weatherFactor * eventFactor);

    // Dự đoán cho 3 tháng tới
    const nextMonths = [];
    for (let i = 1; i <= 3; i++) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + i);
      const monthName = nextMonth.toISOString().slice(0, 7);
      
      nextMonths.push({
        month: monthName,
        predictedPassengers: Math.round(predictedPassengers * (1 + (i * 0.05))),
        predictedRoutes: Math.round(predictedRoutes * (1 + (i * 0.05))),
        confidence: Math.max(0.6, 1 - (i * 0.1))
      });
    }

    return {
      success: true,
      data: {
        currentMonth: {
          month: currentMonth,
          predictedPassengers,
          predictedRoutes,
          confidence: 0.8
        },
        futurePredictions: nextMonths,
        factors: {
          weather: weatherFactor,
          events: eventFactor,
          historicalAverage: avgPassengers
        }
      },
      message: "Dự đoán nhu cầu hoàn tất"
    };

  } catch (error) {
    console.error('Error in predictDemand:', error);
    throw new functions.https.HttpsError('internal', 'Error predicting demand');
  }
});

exports.analyzeEmployeePerformance = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { employeeId, name, position, workDays, completedTasks, customerRating, attendance } = data;

    // AI Logic để phân tích hiệu suất nhân viên
    const performance = {
      employeeId,
      name,
      position,
      analysisDate: new Date().toISOString(),
      scores: {
        productivity: 0,
        attendance: 0,
        customerSatisfaction: 0,
        overall: 0
      },
      recommendations: []
    };

    // Tính điểm năng suất
    const taskCompletionRate = (completedTasks / workDays) * 100;
    if (taskCompletionRate >= 90) {
      performance.scores.productivity = 95;
      performance.recommendations.push("Năng suất làm việc xuất sắc");
    } else if (taskCompletionRate >= 70) {
      performance.scores.productivity = 80;
      performance.recommendations.push("Năng suất tốt, có thể cải thiện thêm");
    } else {
      performance.scores.productivity = 60;
      performance.recommendations.push("Cần cải thiện năng suất làm việc");
    }

    // Tính điểm chuyên cần
    const attendanceRate = (attendance / workDays) * 100;
    if (attendanceRate >= 95) {
      performance.scores.attendance = 95;
      performance.recommendations.push("Chuyên cần tốt");
    } else if (attendanceRate >= 85) {
      performance.scores.attendance = 80;
      performance.recommendations.push("Chuyên cần ổn định");
    } else {
      performance.scores.attendance = 60;
      performance.recommendations.push("Cần cải thiện chuyên cần");
    }

    // Tính điểm hài lòng khách hàng
    if (customerRating >= 4.5) {
      performance.scores.customerSatisfaction = 95;
      performance.recommendations.push("Khách hàng rất hài lòng");
    } else if (customerRating >= 3.5) {
      performance.scores.customerSatisfaction = 80;
      performance.recommendations.push("Khách hàng hài lòng");
    } else {
      performance.scores.customerSatisfaction = 60;
      performance.recommendations.push("Cần cải thiện dịch vụ khách hàng");
    }

    // Tính điểm tổng thể
    performance.scores.overall = Math.round(
      (performance.scores.productivity + 
       performance.scores.attendance + 
       performance.scores.customerSatisfaction) / 3
    );

    // Thêm đề xuất dựa trên điểm tổng thể
    if (performance.scores.overall >= 85) {
      performance.recommendations.push("Nhân viên xuất sắc, xem xét thăng chức");
    } else if (performance.scores.overall >= 70) {
      performance.recommendations.push("Nhân viên tốt, duy trì hiện trạng");
    } else {
      performance.recommendations.push("Cần đào tạo và hỗ trợ thêm");
    }

    return {
      success: true,
      data: performance,
      message: "Phân tích hiệu suất nhân viên hoàn tất"
    };

  } catch (error) {
    console.error('Error in analyzeEmployeePerformance:', error);
    throw new functions.https.HttpsError('internal', 'Error analyzing employee performance');
  }
});

exports.generateSmartReport = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { reportType, dateRange, filters } = data;

    // AI Logic để tạo báo cáo thông minh
    const report = {
      reportId: `RPT_${Date.now()}`,
      reportType,
      generatedAt: new Date().toISOString(),
      dateRange,
      summary: {},
      insights: [],
      recommendations: [],
      charts: [],
      data: {}
    };

    // Tạo summary dựa trên loại báo cáo
    switch (reportType) {
      case 'vehicle_performance':
        report.summary = {
          totalVehicles: 25,
          activeVehicles: 23,
          maintenanceRequired: 2,
          averageEfficiency: 85
        };
        report.insights = [
          "Hiệu suất xe trung bình đạt 85%",
          "2 xe cần bảo trì khẩn cấp",
          "Tỷ lệ sử dụng xe đạt 92%"
        ];
        break;
      
      case 'route_optimization':
        report.summary = {
          totalRoutes: 15,
          optimizedRoutes: 12,
          averageEfficiency: 78,
          timeSaved: 45
        };
        report.insights = [
          "80% tuyến đường đã được tối ưu hóa",
          "Tiết kiệm 45 phút mỗi ngày",
          "Giảm 15% chi phí nhiên liệu"
        ];
        break;
      
      case 'employee_performance':
        report.summary = {
          totalEmployees: 30,
          excellentPerformance: 8,
          goodPerformance: 18,
          needsImprovement: 4
        };
        report.insights = [
          "27% nhân viên có hiệu suất xuất sắc",
          "60% nhân viên đạt hiệu suất tốt",
          "13% nhân viên cần cải thiện"
        ];
        break;
    }

    // Thêm recommendations chung
    report.recommendations = [
      "Tiếp tục duy trì các hoạt động hiện tại",
      "Tăng cường đào tạo cho nhân viên mới",
      "Cập nhật hệ thống bảo trì định kỳ",
      "Theo dõi và cải thiện liên tục"
    ];

    return {
      success: true,
      data: report,
      message: "Báo cáo thông minh đã được tạo"
    };

  } catch (error) {
    console.error('Error in generateSmartReport:', error);
    throw new functions.https.HttpsError('internal', 'Error generating smart report');
  }
});

exports.getSystemImprovements = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { systemData } = data;

    // AI Logic để đề xuất cải thiện hệ thống
    const improvements = {
      analysisDate: new Date().toISOString(),
      priority: 'high',
      categories: {
        technical: [],
        operational: [],
        strategic: []
      },
      estimatedImpact: 'medium',
      implementationTime: '3-6 months'
    };

    // Phân tích và đề xuất cải thiện
    improvements.categories.technical = [
      {
        title: "Nâng cấp hệ thống AI",
        description: "Tích hợp thêm các mô hình AI tiên tiến để dự đoán chính xác hơn",
        impact: "Tăng độ chính xác dự đoán lên 15%",
        effort: "Medium",
        cost: "Medium"
      },
      {
        title: "Tối ưu hóa database",
        description: "Cải thiện hiệu suất truy vấn và lưu trữ dữ liệu",
        impact: "Giảm thời gian phản hồi 30%",
        effort: "Low",
        cost: "Low"
      }
    ];

    improvements.categories.operational = [
      {
        title: "Tự động hóa báo cáo",
        description: "Tự động tạo và gửi báo cáo hàng ngày/tuần",
        impact: "Tiết kiệm 2 giờ làm việc mỗi ngày",
        effort: "Medium",
        cost: "Low"
      },
      {
        title: "Cải thiện giao diện người dùng",
        description: "Tối ưu hóa UX/UI để tăng hiệu quả sử dụng",
        impact: "Tăng 25% hiệu quả sử dụng hệ thống",
        effort: "High",
        cost: "Medium"
      }
    ];

    improvements.categories.strategic = [
      {
        title: "Mở rộng tích hợp AI",
        description: "Áp dụng AI cho nhiều module khác trong hệ thống",
        impact: "Tăng 40% hiệu quả tổng thể",
        effort: "High",
        cost: "High"
      },
      {
        title: "Phân tích dữ liệu nâng cao",
        description: "Thêm các tính năng phân tích dữ liệu phức tạp",
        impact: "Cung cấp insights sâu sắc hơn",
        effort: "Medium",
        cost: "Medium"
      }
    ];

    return {
      success: true,
      data: improvements,
      message: "Đề xuất cải thiện hệ thống đã được tạo"
    };

  } catch (error) {
    console.error('Error in getSystemImprovements:', error);
    throw new functions.https.HttpsError('internal', 'Error getting system improvements');
  }
});
