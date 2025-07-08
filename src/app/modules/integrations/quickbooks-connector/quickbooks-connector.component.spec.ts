import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { QuickbooksConnectorComponent } from './quickbooks-connector.component';
import { QuickBooksService } from '../../services/quickbooks.service';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list'; // For displaying fetched invoices
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

class MockQuickBooksService {
  syncInvoices = jasmine.createSpy('syncInvoices').and.returnValue(of(true));
  syncPayments = jasmine.createSpy('syncPayments').and.returnValue(of(true));
  syncCustomers = jasmine.createSpy('syncCustomers').and.returnValue(of(true));
  fetchQuickBooksInvoices = jasmine.createSpy('fetchQuickBooksInvoices').and.returnValue(of([]));
}

describe('QuickbooksConnectorComponent', () => {
  let component: QuickbooksConnectorComponent;
  let fixture: ComponentFixture<QuickbooksConnectorComponent>;
  let quickbooksService: MockQuickBooksService;

  const mockRawInvoice = { Id: "1", DocNumber: "INV001", TotalAmt: 100, CustomerRef: { value: "cust1", name: "Customer 1" }, Line: [], SyncToken: "0" };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuickbooksConnectorComponent],
      imports: [
        ReactiveFormsModule, // Though this component doesn't have forms, its template might use form directives from Material
        NoopAnimationsModule,
        MatCardModule,
        MatButtonModule,
        MatProgressBarModule,
        MatIconModule,
        MatListModule
      ],
      providers: [
        { provide: QuickBooksService, useClass: MockQuickBooksService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuickbooksConnectorComponent);
    component = fixture.componentInstance;
    quickbooksService = TestBed.inject(QuickBooksService) as unknown as MockQuickBooksService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('syncAllData', () => {
    it('should set isLoading to true and reset messages', () => {
      component.syncAllData();
      expect(component.isLoading).toBeTrue();
      expect(component.errorMessages.length).toBe(0);
      expect(component.successMessages.length).toBe(0);
    });

    it('should call all sync methods on QuickBooksService', fakeAsync(() => {
      component.syncAllData();
      tick(); // allow observables to resolve for all three calls

      expect(quickbooksService.syncInvoices).toHaveBeenCalled();
      expect(quickbooksService.syncPayments).toHaveBeenCalled();
      expect(quickbooksService.syncCustomers).toHaveBeenCalled();

      expect(component.successMessages.length).toBe(3); // Expect 3 success messages
      expect(component.isLoading).toBeFalse();
      expect(component.lastSyncTime).not.toBeNull();
    }));

    it('should handle errors from syncInvoices', fakeAsync(() => {
      quickbooksService.syncInvoices.and.returnValue(throwError(() => new Error('Invoice sync failed')));
      component.syncAllData();
      tick();

      expect(component.errorMessages).toContain('Error syncing invoices: Invoice sync failed');
      // Depending on implementation, other calls might still succeed or not run.
      // Current component runs them in parallel, so others would still complete.
      expect(quickbooksService.syncPayments).toHaveBeenCalled();
      expect(quickbooksService.syncCustomers).toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
    }));

     it('should handle false return from syncPayments (simulating a specific failure type)', fakeAsync(() => {
      quickbooksService.syncPayments.and.returnValue(of(false));
      component.syncAllData();
      tick();

      expect(component.errorMessages).toContain('Failed to sync payments (mock).');
      expect(component.isLoading).toBeFalse();
    }));
  });

  describe('fetchInvoicesFromQuickBooks', () => {
    it('should set isLoading and reset messages/data', () => {
      component.fetchInvoicesFromQuickBooks();
      expect(component.isLoading).toBeTrue();
      expect(component.errorMessages.length).toBe(0);
      expect(component.successMessages.length).toBe(0);
      expect(component.quickbooksInvoices.length).toBe(0);
    });

    it('should call fetchQuickBooksInvoices and populate quickbooksInvoices', fakeAsync(() => {
      quickbooksService.fetchQuickBooksInvoices.and.returnValue(of([mockRawInvoice]));
      component.fetchInvoicesFromQuickBooks();
      tick();

      expect(quickbooksService.fetchQuickBooksInvoices).toHaveBeenCalled();
      expect(component.quickbooksInvoices.length).toBe(1);
      expect(component.quickbooksInvoices[0].Id).toBe("1");
      expect(component.successMessages).toContain('Successfully fetched 1 invoices from QuickBooks (mock).');
      expect(component.isLoading).toBeFalse();
      expect(component.lastSyncTime).not.toBeNull();
    }));

    it('should handle empty array from fetchQuickBooksInvoices', fakeAsync(() => {
      quickbooksService.fetchQuickBooksInvoices.and.returnValue(of([]));
      component.fetchInvoicesFromQuickBooks();
      tick();

      expect(component.quickbooksInvoices.length).toBe(0);
      expect(component.successMessages).toContain('No invoices found in QuickBooks (mock) or an error occurred during fetch.');
      expect(component.isLoading).toBeFalse();
    }));

    it('should handle errors from fetchQuickBooksInvoices', fakeAsync(() => {
      quickbooksService.fetchQuickBooksInvoices.and.returnValue(throwError(() => new Error('Fetch QB invoices failed')));
      component.fetchInvoicesFromQuickBooks();
      tick();

      expect(component.errorMessages).toContain('Error fetching invoices from QuickBooks: Fetch QB invoices failed');
      expect(component.isLoading).toBeFalse();
    }));
  });

  describe('checkCompletion', () => {
    it('should set isLoading to false and update lastSyncTime when all operations complete', () => {
      component.isLoading = true;
      component.lastSyncTime = null;
      (component as any).checkCompletion(3, 3); // Access private method
      expect(component.isLoading).toBeFalse();
      expect(component.lastSyncTime).not.toBeNull();
    });

    it('should not change isLoading if not all operations are complete', () => {
      component.isLoading = true;
      component.lastSyncTime = null;
      (component as any).checkCompletion(2, 3);
      expect(component.isLoading).toBeTrue();
      expect(component.lastSyncTime).toBeNull();
    });
  });
});
