import { Component, OnInit } from '@angular/core';
import { QuickBooksService } from '../../services/quickbooks.service'; // Corrected path assuming service location

@Component({
  selector: 'app-quickbooks-connector',
  templateUrl: './quickbooks-connector.component.html',
  styleUrls: ['./quickbooks-connector.component.scss']
})
export class QuickbooksConnectorComponent implements OnInit {
  isLoading: boolean = false;
  lastSyncTime: Date | null = null;
  errorMessages: string[] = [];
  successMessages: string[] = [];

  // Example: Hold fetched invoices
  quickbooksInvoices: any[] = [];

  constructor(private quickbooksService: QuickBooksService) { }

  ngOnInit(): void {
    // Optionally, fetch some data on init if needed
    // this.fetchInvoices();
  }

  syncAllData(): void {
    this.isLoading = true;
    this.errorMessages = [];
    this.successMessages = [];
    let operationsCompleted = 0;
    const totalOperations = 3; // Invoices, Payments, Customers

    // For simplicity, these are mock data. In a real app, you'd get this from your application's state/services.
    const mockAppInvoices = [{ id: 'appInv1', amount: 100, customerId: 'cust123' }];
    const mockAppPayments = [{ id: 'appPay1', amount: 100, invoiceId: 'appInv1' }];
    const mockAppCustomers = [{ id: 'cust123', name: 'Test Customer App' }];

    this.quickbooksService.syncInvoices(mockAppInvoices).subscribe(
      success => {
        if (success) this.successMessages.push('Invoices synced successfully (mock).');
        else this.errorMessages.push('Failed to sync invoices (mock).');
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      },
      err => {
        this.errorMessages.push(`Error syncing invoices: ${err.message || err}`);
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      }
    );

    this.quickbooksService.syncPayments(mockAppPayments).subscribe(
      success => {
        if (success) this.successMessages.push('Payments synced successfully (mock).');
        else this.errorMessages.push('Failed to sync payments (mock).');
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      },
      err => {
        this.errorMessages.push(`Error syncing payments: ${err.message || err}`);
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      }
    );

    this.quickbooksService.syncCustomers(mockAppCustomers).subscribe(
      success => {
        if (success) this.successMessages.push('Customers synced successfully (mock).');
        else this.errorMessages.push('Failed to sync customers (mock).');
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      },
      err => {
        this.errorMessages.push(`Error syncing customers: ${err.message || err}`);
        operationsCompleted++;
        this.checkCompletion(operationsCompleted, totalOperations);
      }
    );
  }

  fetchInvoicesFromQuickBooks(): void {
    this.isLoading = true;
    this.errorMessages = [];
    this.successMessages = [];
    this.quickbooksInvoices = [];

    this.quickbooksService.fetchQuickBooksInvoices().subscribe(
      invoices => {
        this.quickbooksInvoices = invoices;
        if (invoices.length > 0) {
          this.successMessages.push(`Successfully fetched ${invoices.length} invoices from QuickBooks (mock).`);
        } else {
          this.successMessages.push('No invoices found in QuickBooks (mock) or an error occurred during fetch.');
        }
        this.isLoading = false;
        this.lastSyncTime = new Date();
      },
      err => {
        this.errorMessages.push(`Error fetching invoices from QuickBooks: ${err.message || err}`);
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
