import { Component, OnInit } from '@angular/core';
import { XeroService } from '../../services/xero.service'; // Assuming service is in modules/services

@Component({
  selector: 'app-xero-connector',
  templateUrl: './xero-connector.component.html',
  styleUrls: ['./xero-connector.component.scss']
})
export class XeroConnectorComponent implements OnInit {
  isLoading: boolean = false;
  lastSyncTime: Date | null = null;
  errorMessages: string[] = [];
  successMessages: string[] = [];

  xeroInvoices: any[] = []; // To store fetched Xero invoices

  constructor(private xeroService: XeroService) { }

  ngOnInit(): void {
  }

  syncDataToXero(): void {
    this.isLoading = true;
    this.errorMessages = [];
    this.successMessages = [];
    let operationsCompleted = 0;
    const totalOperations = 3; // Invoices, Payments, Contacts

    // Mock data from your application
    const mockAppInvoices = [{ id: 'appInvX1', amount: 200, customerName: 'App Cust X' }];
    const mockAppPayments = [{ id: 'appPayX1', amount: 200, invoiceId: 'appInvX1' }];
    const mockAppContacts = [{ id: 'appContactX1', name: 'App Customer Xero' }];

    this.xeroService.syncInvoicesToXero(mockAppInvoices).subscribe(
      success => {
        if (success) this.successMessages.push('Invoices synced to Xero successfully (mock).');
        else this.errorMessages.push('Failed to sync invoices to Xero (mock).');
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      },
      err => {
        this.errorMessages.push(`Error syncing invoices to Xero: ${err.message || err}`);
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      }
    );

    this.xeroService.syncPaymentsToXero(mockAppPayments).subscribe(
      success => {
        if (success) this.successMessages.push('Payments synced to Xero successfully (mock).');
        else this.errorMessages.push('Failed to sync payments to Xero (mock).');
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      },
      err => {
        this.errorMessages.push(`Error syncing payments to Xero: ${err.message || err}`);
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      }
    );

    this.xeroService.syncContactsToXero(mockAppContacts).subscribe(
      success => {
        if (success) this.successMessages.push('Contacts synced to Xero successfully (mock).');
        else this.errorMessages.push('Failed to sync contacts to Xero (mock).');
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      },
      err => {
        this.errorMessages.push(`Error syncing contacts to Xero: ${err.message || err}`);
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      }
    );
  }

  fetchInvoicesFromXero(): void {
    this.isLoading = true;
    this.errorMessages = [];
    this.successMessages = [];
    this.xeroInvoices = [];

    this.xeroService.fetchInvoicesFromXero().subscribe(
      invoices => {
        this.xeroInvoices = invoices;
        if (invoices.length > 0) {
          this.successMessages.push(`Successfully fetched ${invoices.length} invoices from Xero (mock).`);
        } else {
          this.successMessages.push('No invoices found in Xero (mock) or an error occurred during fetch.');
        }
        this.isLoading = false;
        this.lastSyncTime = new Date();
      },
      err => {
        this.errorMessages.push(`Error fetching invoices from Xero: ${err.message || err}`);
        this.isLoading = false;
        this.lastSyncTime = new Date();
      }
    );
  }

  private checkCompletion(completed: number, total: number): void {
    if (completed === total) {
      this.isLoading = false;
      this.lastSyncTime = new Date();
    }
  }
}
