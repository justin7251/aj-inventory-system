import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefaultComponent } from './default.component';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { DashboardService } from 'src/app/modules/dashboard.service';
import { ItemService } from 'src/app/modules/services/item.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

// CDK modules
// import {A11yModule} from '@angular/cdk/a11y'; // Not used
// import {DragDropModule} from '@angular/cdk/drag-drop'; // Not used
// import {PortalModule} from '@angular/cdk/portal'; // Not used
// import {ScrollingModule} from '@angular/cdk/scrolling'; // Not used
// import {CdkStepperModule} from '@angular/cdk/stepper'; // Not used
// import {CdkTableModule} from '@angular/cdk/table'; // Not used
// import {CdkTreeModule} from '@angular/cdk/tree'; // Not used

// Material modules
// import {MatAutocompleteModule} from '@angular/material/autocomplete'; // Not used
// import {MatBadgeModule} from '@angular/material/badge'; // Not used
// import {MatBottomSheetModule} from '@angular/material/bottom-sheet'; // Not used
import {MatButtonModule} from '@angular/material/button';
// import {MatButtonToggleModule} from '@angular/material/button-toggle'; // Not used
import {MatCardModule} from '@angular/material/card';
// import {MatCheckboxModule} from '@angular/material/checkbox'; // Not used
// import {MatChipsModule} from '@angular/material/chips'; // Not used
// import {MatStepperModule} from '@angular/material/stepper'; // Not used
// import {MatDatepickerModule} from '@angular/material/datepicker'; // Not used
import {MatDialogModule} from '@angular/material/dialog';
import {MatDividerModule} from '@angular/material/divider';
// import {MatExpansionModule} from '@angular/material/expansion'; // Not used
// import {MatGridListModule} from '@angular/material/grid-list'; // Not used
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
// import {MatListModule} from '@angular/material/list'; // Not used
// import {MatMenuModule} from '@angular/material/menu'; // Not used
// import {MatNativeDateModule, MatRippleModule} from '@angular/material/core'; // Not used
import {MatPaginatorModule} from '@angular/material/paginator';
// import {MatProgressBarModule} from '@angular/material/progress-bar'; // Not used
// import {MatProgressSpinnerModule} from '@angular/material/progress-spinner'; // Not used
// import {MatRadioModule} from '@angular/material/radio'; // Not used
// import {MatSelectModule} from '@angular/material/select'; // Not used
// import {MatSidenavModule} from '@angular/material/sidenav'; // Not used
// import {MatSliderModule} from '@angular/material/slider'; // Not used
// import {MatSlideToggleModule} from '@angular/material/slide-toggle'; // Not used
// import {MatSnackBarModule} from '@angular/material/snack-bar'; // Not used
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
// import {MatTabsModule} from '@angular/material/tabs'; // Not used
// import {MatToolbarModule} from '@angular/material/toolbar'; // Not used
// import {MatTooltipModule} from '@angular/material/tooltip'; // Not used
// import {MatTreeModule} from '@angular/material/tree'; // Not used

import { DashboardModule } from 'src/app/modules/dashboard/dashboard.module';
import { PostsModule } from 'src/app/modules/posts/posts.module';
import { ItemsModule } from 'src/app/modules/items/items.module';
import { OrderModule } from 'src/app/modules/order/order.module';
import { PurchaseModule } from 'src/app/modules/purchase/purchase.module';
import { ProductFormModule } from 'src/app/modules/product-form/product-form.module';



@NgModule({
  declarations: [
    DefaultComponent
  ],
  imports: [
    // A11yModule, // Not used
    // CdkStepperModule, // Not used
    // CdkTableModule, // Not used
    // CdkTreeModule, // Not used
    // DragDropModule, // Not used
    // MatAutocompleteModule, // Not used
    // MatBadgeModule, // Not used
    // MatBottomSheetModule, // Not used
    MatButtonModule,
    // MatButtonToggleModule, // Not used
    MatCardModule,
    // MatCheckboxModule, // Not used
    // MatChipsModule, // Not used
    // MatStepperModule, // Not used
    // MatDatepickerModule, // Not used
    MatDialogModule,
    MatDividerModule,
    // MatExpansionModule, // Not used
    // MatGridListModule, // Not used
    MatIconModule,
    MatInputModule,
    // MatListModule, // Not used
    // MatMenuModule, // Not used
    // MatNativeDateModule, // Not used
    MatPaginatorModule,
    // MatProgressBarModule, // Not used
    // MatProgressSpinnerModule, // Not used
    // MatRadioModule, // Not used
    // MatRippleModule, // Not used
    // MatSelectModule, // Not used
    // MatSidenavModule, // Not used
    // MatSliderModule, // Not used
    // MatSlideToggleModule, // Not used
    // MatSnackBarModule, // Not used
    MatSortModule,
    MatTableModule,
    // MatTabsModule, // Not used
    // MatToolbarModule, // Not used
    // MatTooltipModule, // Not used
    // MatTreeModule, // Not used
    // PortalModule, // Not used
    // ScrollingModule, // Not used
    CommonModule,
    RouterModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    DashboardModule,
    PostsModule,
    ItemsModule,
    OrderModule,
    PurchaseModule,
    ProductFormModule
  ],
  providers: [
    DashboardService,
    ItemService
  ]
})
export class DefaultModule { }
