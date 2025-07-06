import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library'; // Reverted path

@Component({
  selector: 'app-barcode-scanner',
  templateUrl: './barcode-scanner.component.html',
  styleUrls: ['./barcode-scanner.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    ZXingScannerModule,
  ],
})
export class BarcodeScannerComponent {
  @Output() scanSuccess = new EventEmitter<string>();

  allowedFormats = [
    BarcodeFormat.CODE_128,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E
  ];

  constructor(public dialogRef: MatDialogRef<BarcodeScannerComponent>) {}

  onScanSuccess(result: string): void {
    this.scanSuccess.emit(result);
    this.dialogRef.close(result);
  }

  onScanError(error: Error): void {
    console.error('Barcode scanning error:', error);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
