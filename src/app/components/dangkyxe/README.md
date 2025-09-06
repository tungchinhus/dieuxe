# DangKyXe Component

## Overview
The DangKyXe (Vehicle Registration) component is a comprehensive Angular application for managing employee shuttle registration information. It provides a modern, responsive interface built with Angular Material UI.

## Features

### Main Features
- **Data Table**: Displays registration data with sorting, pagination, and search functionality
- **Add Registration**: Modal dialog for adding new vehicle registrations
- **Edit Registration**: Edit existing registrations with pre-populated form data
- **Delete Registration**: Remove registrations with confirmation dialog
- **Search**: Real-time search by name, department, or employee ID
- **Bulk Selection**: Select multiple registrations using checkboxes
- **Excel Import**: File upload for importing data from Excel files
- **Responsive Design**: Mobile-friendly interface

### Form Fields
- **Basic Information**:
  - Employee ID (Mã Nhân Viên)
  - Full Name (Họ Tên)
  - Phone Number (Số Điện Thoại)
  - Department (Phòng Ban)

- **Schedule Information**:
  - Registration Date (Ngày Đăng Ký)
  - Work Shift Type (Loại Ca)
  - Start Time (Thời Gian Bắt Đầu)
  - End Time (Thời Gian Kết Thúc)

- **Transportation Information**:
  - Route (Tuyến Xe)
  - Pickup Station (Trạm/Điểm Đón)
  - Work Description (Nội Dung Công Việc)
  - Meal Registration (Đăng ký cơm)

## Technical Implementation

### Components Structure
```
src/app/components/dangkyxe/
├── dangkyxe.component.ts          # Main component
├── dangkyxe.component.html        # Main template
├── dangkyxe.component.css         # Main styles
├── registration-form-dialog/
│   ├── registration-form-dialog.component.ts
│   ├── registration-form-dialog.component.html
│   └── registration-form-dialog.component.css
└── README.md
```

### Models
```
src/app/models/
└── registration.model.ts          # TypeScript interfaces
```

### Key Technologies
- **Angular 20+**: Latest Angular framework
- **Angular Material**: UI component library
- **Reactive Forms**: Form handling and validation
- **Signals**: Modern Angular state management
- **TypeScript**: Type-safe development

### State Management
The component uses Angular signals for reactive state management:
- `registrations`: Main data array
- `filteredRegistrations`: Filtered data for display
- `selectedRegistrations`: Selected items for bulk operations
- `isLoading`: Loading state indicator
- `searchTerm`: Current search query

### Form Validation
- Required field validation
- Minimum length validation
- Pattern validation for phone numbers
- Real-time validation feedback

### Responsive Design
- Mobile-first approach
- Flexible grid layouts
- Touch-friendly interface
- Optimized for various screen sizes

## Usage

### Navigation
The component is accessible via the main navigation menu under "Đăng ký xe" (Vehicle Registration).

### Adding New Registration
1. Click "Thêm Đăng ký" (Add Registration) button
2. Fill in the required information in the modal dialog
3. Click "Lưu Đăng Ký" (Save Registration) to save

### Editing Registration
1. Click the edit icon (pencil) in the actions column
2. Modify the information in the pre-populated form
3. Click "Cập nhật" (Update) to save changes

### Deleting Registration
1. Click the delete icon (trash) in the actions column
2. Confirm the deletion in the confirmation dialog

### Searching
- Use the search field to filter by name, department, or employee ID
- Search is performed in real-time as you type

### Excel Import
1. Click "Import từ Excel" (Import from Excel) button
2. Select an Excel file (.xlsx or .xls)
3. The system will process the file (implementation pending)

## Customization

### Adding New Departments
Update the `departments` array in `dangkyxe.component.ts`:
```typescript
departments: Department[] = [
  { value: 'KT', label: 'Phòng Kỹ Thuật' },
  { value: 'NS', label: 'Phòng Nhân Sự' },
  // Add new departments here
];
```

### Adding New Routes
Update the `routes` array in `dangkyxe.component.ts`:
```typescript
routes: Route[] = [
  { value: 'T1', label: 'Tuyến 1 - KCN Biên Hòa 2' },
  { value: 'T2', label: 'Tuyến 2 - Ngã 3 Vũng Tàu' },
  // Add new routes here
];
```

### Adding New Work Shifts
Update the `workShifts` array in `dangkyxe.component.ts`:
```typescript
workShifts: WorkShift[] = [
  { value: 'HC', label: 'Hành chính (08:00 - 17:00)' },
  { value: 'C1', label: 'Ca 1 (06:00 - 14:00)' },
  // Add new shifts here
];
```

## Future Enhancements
- Excel export functionality
- Advanced filtering options
- Bulk operations (delete, update)
- Data visualization charts
- Email notifications
- API integration for real data
- User authentication and authorization
- Audit trail for changes
