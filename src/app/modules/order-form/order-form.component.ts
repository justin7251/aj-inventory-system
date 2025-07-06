import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { UntypedFormBuilder, UntypedFormGroup, UntypedFormArray, Validators } from '@angular/forms';
import { OrderService } from '../services/order.service'; // Changed ItemService to OrderService
import { ProductService } from '../services/product.service'; // Added ProductService
import { MatSnackBar } from '@angular/material/snack-bar'; // Added MatSnackBar for notifications
import { MatDialog } from '@angular/material/dialog'; // Added MatDialog for item selection
import { ItemDialogComponent } from '../item-dialog/item-dialog.component'; // Component for item selection dialog
import { Product } from '../model/product.model'; // Product model for type safety
import { OrderItem } from '../model/order.model'; // OrderItem model for type safety


@Component({
  selector: 'app-order-form',
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.scss']
})
export class OrderFormComponent implements OnInit {
  // uid: string; // uid seems to be related to user, might come from AuthService or route data
  // items: []; // This seems unused, items are in the form array
  // total: number = 0; // total_cost is part of the form
  orderForm: UntypedFormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  @ViewChild('resetOrderForm') myNgForm; // This might not be needed with reactive forms reset

  // Assuming isEditMode and orderId would be needed if this form handles edits
  isEditMode: boolean = false;
  orderId: string | null = null;
  availableProducts: Product[] = []; // To store products for selection

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location, // Keep if used for navigation
    public orderService: OrderService, // Changed db to orderService
    private productService: ProductService, // Injected ProductService
    private fb: UntypedFormBuilder,
    private snackBar: MatSnackBar, // Injected MatSnackBar
    private dialog: MatDialog // Injected MatDialog
  ) { }

  ngOnInit(): void {
    // Example: Get user ID from route data if needed for orders
    // this.route.data.subscribe(routeData => {
    //   let data = routeData['data'];
    //   if (data) { this.uid = data.uid; }
    // });

    // Example: Check for edit mode
    this.orderId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.orderId;

    this.createForm();
    this.loadProducts(); // Load products for item selection

    if (this.isEditMode && this.orderId) {
      this.orderService.getOrderById(this.orderId).subscribe(orderData => {
        if (orderData) {
          this.orderForm.patchValue(orderData);
          if (orderData.items && Array.isArray(orderData.items)) {
            orderData.items.forEach(() => this.addItem()); // Add empty item forms
            this.itemForms.patchValue(orderData.items); // Patch values into them
          }
          this.calculateTotal();
        } else {
          this.snackBar.open('Order not found!', 'OK', { duration: 3000 });
          this.router.navigate(['/default/orders']); // Adjust navigation path
        }
      });
    }
  }

  createForm() {
    this.orderForm = this.fb.group({
      customer_name: ['', Validators.required],
      telephone: ['', Validators.required],
      delivery_address: '',
      payment_type: ['', Validators.required],
      delivery_cost: [0], // Provide default value
      discount: [0],    // Provide default value
      items: this.fb.array([]),
      total_cost: [{ value: 0, disabled: true }, Validators.required], // Initialize and disable
      status: ['Pending', Validators.required] // Default status
    });

    // Recalculate total when items, delivery_cost, or discount change
    this.orderForm.get('items').valueChanges.subscribe(() => this.calculateTotal());
    this.orderForm.get('delivery_cost').valueChanges.subscribe(() => this.calculateTotal());
    this.orderForm.get('discount').valueChanges.subscribe(() => this.calculateTotal());
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(
      // Assuming getAllProducts returns Product[] directly or similar structure that can be mapped
      // This might need adjustment based on actual ProductService.getAllProducts() return type
      (productsPayload: any[]) => { // Adjust 'any[]' to the actual type from ProductService
        this.availableProducts = productsPayload.map(item => {
          const data = item.payload.doc.data() as Product;
          const id = item.payload.doc.id;
          return { id, ...data };
        });
      },
      error => console.error('Error loading products:', error)
    );
  }


  get itemForms() {
    return this.orderForm.get('items') as UntypedFormArray;
  }

  addItem(itemData?: OrderItem) { // Allow passing initial data for an item
    const itemFormGroup = this.fb.group({
      product_name: [itemData?.product_name || '', Validators.required],
      product_no: [itemData?.product_no || '', Validators.required],
      // color: [itemData?.color || ''], // Color might not be directly on OrderItem, check model
      quantity: [itemData?.quantity || 1, [Validators.required, Validators.min(1)]],
      item_cost: [itemData?.item_cost || 0, [Validators.required, Validators.min(0)]],
    });
    this.itemForms.push(itemFormGroup);
    this.calculateTotal(); // Recalculate total when an item is added
  }

  openItemDialog(itemIndex?: number): void {
    const dialogRef = this.dialog.open(ItemDialogComponent, {
      width: '400px',
      data: { products: this.availableProducts, currentItem: itemIndex !== undefined ? this.itemForms.at(itemIndex).value : null }
    });

    dialogRef.afterClosed().subscribe((result: OrderItem) => {
      if (result) {
        if (itemIndex !== undefined) {
          this.itemForms.at(itemIndex).patchValue(result);
        } else {
          this.addItem(result); // Add as a new item
        }
        this.calculateTotal();
      }
    });
  }


  deleteItem(i: number) { // Explicitly type i
    this.itemForms.removeAt(i);
    this.calculateTotal(); // Recalculate total when an item is removed
  }

  calculateTotal(): void {
    let subtotal = 0;
    this.itemForms.controls.forEach(itemGroup => {
      const quantity = Number(itemGroup.get('quantity').value) || 0;
      const itemCost = Number(itemGroup.get('item_cost').value) || 0;
      subtotal += quantity * itemCost;
    });
    const deliveryCost = Number(this.orderForm.get('delivery_cost').value) || 0;
    const discount = Number(this.orderForm.get('discount').value) || 0;
    const total = subtotal + deliveryCost - discount;
    this.orderForm.get('total_cost').setValue(total.toFixed(2));
  }

  onSubmit() { // Removed 'value' parameter, using this.orderForm.getRawValue()
    // value.uid = this.uid; // uid needs to be sourced, e.g., from AuthService or route
    if (this.orderForm.valid) {
      const orderData = this.orderForm.getRawValue(); // Use getRawValue to include disabled total_cost
      // orderData.uid = this.uid; // Assign uid if needed

      if (this.isEditMode && this.orderId) {
        this.orderService.updateOrder(this.orderId, orderData)
          .then(() => {
            this.successMessage = "Order Updated Successfully!";
            this.snackBar.open(this.successMessage, 'OK', { duration: 3000 });
            this.router.navigate(['/default/orders']); // Or to order details
          }, err => {
            this.errorMessage = err.message;
            this.snackBar.open(`Error: ${this.errorMessage}`, 'OK', { duration: 3000 });
          });
      } else {
        this.orderService.createOrder(orderData) // Changed db.addOrder to orderService.createOrder
          .then(() => { // Changed res to ()
            this.resetForm();
            this.successMessage = "Order Created!";
            this.snackBar.open(this.successMessage, 'OK', { duration: 3000 });
            this.router.navigate(['/default/orders']); // Navigate after successful creation
          }, err => {
            console.log(err);
            this.errorMessage = err.message;
            this.successMessage = "";
            this.snackBar.open(`Error: ${this.errorMessage}`, 'OK', { duration: 3000 });
          });
      }
    } else {
      this.snackBar.open('Please fill all required fields correctly.', 'OK', { duration: 3000 });
    }
  }

  /* Reset form */
  resetForm() {
    this.itemForms.clear(); // Clear items array
    this.orderForm.reset({
      delivery_cost: 0, // Reset with default values
      discount: 0,
      total_cost: 0,
      status: 'Pending'
    });
    // Optionally re-add one empty item row if desired for new forms
    // this.addItem();
  }
}
