import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Registration } from '../../../models/registration.model';

export interface DuplicateDataDialogData {
  duplicates: Registration[];
  validData: Registration[];
  duplicateDetails: string[];
  totalRecords: number;
  allDuplicates?: boolean;
}

@Component({
  selector: 'app-duplicate-data-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatCheckboxModule
  ],
  templateUrl: './duplicate-data-dialog.component.html',
  styleUrl: './duplicate-data-dialog.component.css'
})
export class DuplicateDataDialogComponent implements OnInit {
  
  constructor(
    public dialogRef: MatDialogRef<DuplicateDataDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DuplicateDataDialogData
  ) {}

  ngOnInit(): void {
    console.log('Duplicate data dialog opened with:', this.data);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      total: this.data.totalRecords,
      duplicates: this.data.duplicates.length,
      valid: this.data.validData.length
    };
  }


  /**
   * Close dialog
   */
  cancelImport(): void {
    this.dialogRef.close({
      action: 'cancel'
    });
  }
}
