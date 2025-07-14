import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
// Assuming a generic Invoice model might be shared or defined here
// For now, we'll use 'any' for simplicity for QuickBooks specific data structures

// Placeholder for raw QuickBooks Invoice data
interface RawQuickBooksInvoice {
  Id: string;
  SyncToken: string;
  DocNumber?: string;
  TxnDate?: string; // YYYY-MM-DD
  CustomerRef: {
    value: string; // Customer ID
    name?: string; // Customer Name
  };
  Line: Array<{
    Id?: string;
    LineNum?: number;
    Description?: string;
    Amount: number;
    DetailType: string; // e.g., "SalesItemLineDetail"
    SalesItemLineDetail?: {
      ItemRef: {
        value: string; // Item ID
        name?: string; // Item Name
      };
      Qty?: number;
      UnitPrice?: number;
    };
  }>;
  TotalAmt: number;
  Balance?: number; // Remaining balance
  // ... other QuickBooks invoice fields
}

// Placeholder for raw QuickBooks Payment data
interface RawQuickBooksPayment {
  Id: string;
  SyncToken: string;
  TxnDate?: string;
  CustomerRef: {
    value: string;
    name?: string;
  };
  TotalAmt: number;
  // ... other QuickBooks payment fields
}

// Placeholder for raw QuickBooks Customer data
interface RawQuickBooksCustomer {
  Id: string;
  SyncToken: string;
  DisplayName?: string;
  PrimaryEmailAddr?: {
    Address: string;
  };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string; // State/Province
    PostalCode?: string;
    Country?: string;
  };
  // ... other QuickBooks customer fields
}

@Injectable({
  providedIn: 'root'
})
export class QuickBooksService {
  private quickBooksApiEndpoint = environment.quickbooksApiConfig?.endpoint;
  private mockDataUrlPrefix = environment.quickbooksApiConfig?.mockDataUrlPrefix; // e.g., /assets/mocks/quickbooks-

  constructor(private http: HttpClient) {
    if (!this.quickBooksApiEndpoint && !this.mockDataUrlPrefix) {
      console.warn('QuickBooksService: API endpoint or mockDataUrlPrefix is not configured.');
    }
  }

  // --- Invoice Synchronization ---
  syncInvoices(invoices: any[] /* Replace 'any' with your app's Invoice model */): Observable<boolean> {
    if (this.quickBooksApiEndpoint) {
      // TODO: Implement actual POST/PUT to this.quickBooksApiEndpoint/invoice
      return this.http.post<any>(`${this.quickBooksApiEndpoint}/invoice`, invoices).pipe(
        map(() => true),
        catchError(error => {
          console.error('QuickBooksService: Error syncing invoices', error);
          return of(false);
        })
      );
    } else {
      console.log('QuickBooksService: Simulating invoice sync (mock). Data:', invoices);
      return of(true);
    }
  }

  fetchQuickBooksInvoices(): Observable<RawQuickBooksInvoice[]> {
    if (this.mockDataUrlPrefix) {
      return this.http.get<RawQuickBooksInvoice[]>(`${this.mockDataUrlPrefix}invoices.json`).pipe(
        catchError(err => {
          console.error('Error fetching mock QuickBooks invoices:', err);
          return of([]);
        })
      );
    } else if (this.quickBooksApiEndpoint) {
      // TODO: Implement actual GET from this.quickBooksApiEndpoint/query?query=SELECT * FROM Invoice
      return this.http.get<RawQuickBooksInvoice[]>(`${this.quickBooksApiEndpoint}/query?query=SELECT * FROM Invoice`).pipe(
        catchError(error => {
          console.error('QuickBooksService: Error fetching invoices', error);
          return of([]);
        })
      );
    } else {
      console.error('QuickBooksService: No API endpoint or mock data URL. Returning hardcoded mock invoices.');
      return of(this.getHardcodedMockInvoices());
    }
  }

  // --- Payment Synchronization ---
  syncPayments(payments: any[] /* Replace 'any' with your app's Payment model */): Observable<boolean> {
    if (this.quickBooksApiEndpoint) {
      // TODO: Implement actual POST/PUT to this.quickBooksApiEndpoint/payment
      return this.http.post<any>(`${this.quickBooksApiEndpoint}/payment`, payments).pipe(
        map(() => true),
        catchError(error => {
          console.error('QuickBooksService: Error syncing payments', error);
          return of(false);
        })
      );
    } else {
      console.log('QuickBooksService: Simulating payment sync (mock). Data:', payments);
      return of(true);
    }
  }

  // --- Customer Data Synchronization ---
  syncCustomers(customers: any[] /* Replace 'any' with your app's Customer model */): Observable<boolean> {
    if (this.quickBooksApiEndpoint) {
      // TODO: Implement actual POST/PUT to this.quickBooksApiEndpoint/customer
      return this.http.post<any>(`${this.quickBooksApiEndpoint}/customer`, customers).pipe(
        map(() => true),
        catchError(error => {
          console.error('QuickBooksService: Error syncing customers', error);
          return of(false);
        })
      );
    } else {
      console.log('QuickBooksService: Simulating customer sync (mock). Data:', customers);
      return of(true);
    }
  }

  private getHardcodedMockInvoices(): RawQuickBooksInvoice[] {
    return [
      {
        Id: "1", SyncToken: "0", DocNumber: "INV001", TxnDate: "2023-01-15",
        CustomerRef: { value: "101", name: "Customer A" },
        Line: [{ Amount: 100, DetailType: "SalesItemLineDetail", SalesItemLineDetail: { ItemRef: { value: "ITEM01", name: "Product 1" }, Qty: 1, UnitPrice: 100 } }],
        TotalAmt: 100
      },
      {
        Id: "2", SyncToken: "0", DocNumber: "INV002", TxnDate: "2023-01-20",
        CustomerRef: { value: "102", name: "Customer B" },
        Line: [{ Amount: 250, DetailType: "SalesItemLineDetail", SalesItemLineDetail: { ItemRef: { value: "ITEM02", name: "Service X" }, Qty: 5, UnitPrice: 50 } }],
        TotalAmt: 250, Balance: 50
      }
    ];
  }
  // Add similar getHardcodedMockPayments, getHardcodedMockCustomers if needed for fetching from QuickBooks
}
