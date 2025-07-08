import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { XeroConnectorComponent } from './xero-connector.component';
import { XeroService } from '../../services/xero.service';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

class MockXeroService {
  syncInvoicesToXero = jasmine.createSpy('syncInvoicesToXero').and.returnValue(of(true));
  syncPaymentsToXero = jasmine.createSpy('syncPaymentsToXero').and.returnValue(of(true));
  syncContactsToXero = jasmine.createSpy('syncContactsToXero').and.returnValue(of(true));
  fetchInvoicesFromXero = jasmine.createSpy('fetchInvoicesFromXero').and.returnValue(of([]));
}

describe('XeroConnectorComponent', () => {
  let component: XeroConnectorComponent;
  let fixture: ComponentFixture<XeroConnectorComponent>;
  let xeroService: MockXeroService;

  const mockRawXeroInvoice = { InvoiceID: "x1", Type: "ACCREC", Contact: { Name: "Test Xero Cust" }, Total: 100, Status: "AUTHORISED" };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [XeroConnectorComponent],
      imports: [
        ReactiveFormsModule, // Not strictly needed by this component's TS but good for consistency if template uses it
        NoopAnimationsModule,
        MatCardModule,
        MatButtonModule,
        MatProgressBarModule,
        MatIconModule,
        MatListModule
      ],
      providers: [
        { provide: XeroService, useClass: MockXeroService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(XeroConnectorComponent);
    component = fixture.componentInstance;
    xeroService = TestBed.inject(XeroService) as unknown as MockXeroService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('syncDataToXero', () => {
    it('should set isLoading to true and reset messages', () => {
      component.syncDataToXero();
      expect(component.isLoading).toBeTrue();
      expect(component.errorMessages.length).toBe(0);
      expect(component.successMessages.length).toBe(0);
    });

    it('should call all sync methods on XeroService', fakeAsync(() => {
      component.syncDataToXero();
      tick(); // Resolve all observables

      expect(xeroService.syncInvoicesToXero).toHaveBeenCalled();
      expect(xeroService.syncPaymentsToXero).toHaveBeenCalled();
      expect(xeroService.syncContactsToXero).toHaveBeenCalled();

      expect(component.successMessages.length).toBe(3);
      expect(component.isLoading).toBeFalse();
      expect(component.lastSyncTime).not.toBeNull();
    }));

    it('should handle errors from syncContactsToXero', fakeAsync(() => {
      xeroService.syncContactsToXero.and.returnValue(throwError(() => new Error('Contact sync failed')));
      component.syncDataToXero();
      tick();

      expect(component.errorMessages).toContain('Error syncing contacts to Xero: Contact sync failed');
      expect(component.isLoading).toBeFalse();
    }));

    it('should handle false return from syncInvoicesToXero', fakeAsync(() => {
      xeroService.syncInvoicesToXero.and.returnValue(of(false));
      component.syncDataToXero();
      tick();
      expect(component.errorMessages).toContain('Failed to sync invoices to Xero (mock).');
      expect(component.isLoading).toBeFalse();
    }));
  });

  describe('fetchInvoicesFromXero', () => {
    it('should set isLoading and reset messages/data', () => {
      component.fetchInvoicesFromXero();
      expect(component.isLoading).toBeTrue();
      expect(component.errorMessages.length).toBe(0);
      expect(component.successMessages.length).toBe(0);
      expect(component.xeroInvoices.length).toBe(0);
    });

    it('should call fetchInvoicesFromXero and populate xeroInvoices', fakeAsync(() => {
      xeroService.fetchInvoicesFromXero.and.returnValue(of([mockRawXeroInvoice]));
      component.fetchInvoicesFromXero();
      tick();

      expect(xeroService.fetchInvoicesFromXero).toHaveBeenCalled();
      expect(component.xeroInvoices.length).toBe(1);
      expect(component.xeroInvoices[0].InvoiceID).toBe("x1");
      expect(component.successMessages).toContain('Successfully fetched 1 invoices from Xero (mock).');
      expect(component.isLoading).toBeFalse();
      expect(component.lastSyncTime).not.toBeNull();
    }));

    it('should handle empty array from fetchInvoicesFromXero', fakeAsync(() => {
        xeroService.fetchInvoicesFromXero.and.returnValue(of([]));
        component.fetchInvoicesFromXero();
        tick();
        expect(component.successMessages).toContain('No invoices found in Xero (mock) or an error occurred during fetch.');
        expect(component.isLoading).toBeFalse();
    }));


    it('should handle errors from fetchInvoicesFromXero', fakeAsync(() => {
      xeroService.fetchInvoicesFromXero.and.returnValue(throwError(() => new Error('Fetch Xero invoices failed')));
      component.fetchInvoicesFromXero();
      tick();

      expect(component.errorMessages).toContain('Error fetching invoices from Xero: Fetch Xero invoices failed');
      expect(component.isLoading).toBeFalse();
    }));
  });


  describe('checkCompletion private method', () => {
    it('should set isLoading to false and update lastSyncTime when all operations complete', () => {
      component.isLoading = true;
      component.lastSyncTime = null;
      (component as any).checkCompletion(3, 3);
      expect(component.isLoading).toBeFalse();
      expect(component.lastSyncTime).not.toBeNull();
    });

    it('should not change isLoading if not all operations are complete', () => {
      component.isLoading = true;
      component.lastSyncTime = null;
      (component as any).checkCompletion(1, 3);
      expect(component.isLoading).toBeTrue();
      expect(component.lastSyncTime).toBeNull();
    });
  });
});
