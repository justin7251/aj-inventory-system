import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IntegrationsLandingComponent } from './integrations-landing.component';
import { SharedModule } from '../../../shared/shared.module'; // For Material components

describe('IntegrationsLandingComponent', () => {
  let component: IntegrationsLandingComponent;
  let fixture: ComponentFixture<IntegrationsLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IntegrationsLandingComponent ],
      imports: [
        RouterTestingModule, // For routerLink
        NoopAnimationsModule,
        SharedModule         // For MatNavList, MatCard, MatIcon etc.
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntegrationsLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a list of integrations', () => {
    expect(component.integrations).toBeDefined();
    expect(component.integrations.length).toBeGreaterThanOrEqual(2); // eBay and Shopify
  });

  it('should display integration names and descriptions in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const integrationItems = compiled.querySelectorAll('mat-nav-list a');

    expect(integrationItems.length).toBe(component.integrations.length);

    component.integrations.forEach((integration, index) => {
      const itemElement = integrationItems[index];
      expect(itemElement?.textContent).toContain(integration.name);
      expect(itemElement?.textContent).toContain(integration.description);
      expect(itemElement?.getAttribute('href')).toBe(integration.path.replace('./', '/')); // routerLink relative path
    });
  });
});
