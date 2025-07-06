import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, UntypedFormArray, Validators } from '@angular/forms';
import { OrderService } from '../services/order.service'; // Changed ItemService to OrderService
import { Order } from '../model/order.model';

@Component({
  selector: 'app-order-edit',
  templateUrl: './order-edit.component.html',
  styleUrls: ['./order-edit.component.scss']
})
export class OrderEditComponent implements OnInit {
  editOrderForm: UntypedFormGroup;
  // items: []; // This property seems unused, items are handled by the form array
  id: string;
  start: boolean = true; // This flag might need review for its purpose

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public orderService: OrderService, // Changed db to orderService
    private fb: UntypedFormBuilder
  ) {
    this.id = this.route.snapshot.paramMap.get('id');
    // Initialize form in constructor or ngOnInit before subscribing to data
    this.updateOrderForm(); // Initialize form structure first

    if (this.id) { // Check if id exists before trying to fetch
      this.orderService.getOrderById(this.id).subscribe(data => { // Changed db.GetOrder to orderService.getOrderById
        if (data) { // Check if data is not null or undefined
          if (this.start && data.items && Array.isArray(data.items)) { // Ensure data.items is an array
            for (let i = 0; i < data.items.length; ++i) {
              this.addItem();
            }
            this.start = false;
          }
          this.editOrderForm.patchValue(data);
        } else {
          console.error(`Order with id ${this.id} not found.`);
          // Optionally navigate away or show a message
          // this.router.navigate(['/orders']); // Example navigation
        }
      }, error => {
        console.error('Error fetching order:', error);
        // Handle error, e.g., navigate away or show error message
      });
    } else {
      console.error('No order ID found in route parameters.');
      // Handle missing ID, e.g., navigate to orders list or show error
      // this.router.navigate(['/orders']); // Example navigation
    }
  }

  ngOnInit(): void {
    // updateOrderForm is already called in constructor.
    // If it needs to be in ngOnInit, ensure it's called after id is available
    // and potentially after data is fetched if form structure depends on data.
  }

  /* Update form */
  updateOrderForm() {
    this.editOrderForm = this.fb.group({
      customer_name: ['', Validators.required],
      telephone: ['', Validators.required],
      delivery_address: '',
      payment_type: ['', Validators.required],
      delivery_cost: '',
      discount: '',
      items: this.fb.array([]),
      total_cost: ['', Validators.required],
      status: [''] // Added status, ensure it's part of your Order model if needed
    });
  }

  get itemForms() {
    return this.editOrderForm.get('items') as UntypedFormArray;
  }

  addItem() {
    const item = this.fb.group({
      product_name: ['', Validators.required], // Changed name to product_name to match OrderItem
      product_no: ['', Validators.required],
      // color: '', // Color might not be part of OrderItem, check model
      quantity: ['', Validators.required],
      item_cost: ['', Validators.required],
    });
    this.itemForms.push(item);
  }

  deleteItem(i: number) { // Explicitly type i
    this.itemForms.removeAt(i);
  }

  onSubmit() { // Removed 'value' parameter, using this.editOrderForm.value
    if (this.editOrderForm.valid) {
      // Changed db.UpdateOrder to orderService.updateOrder
      this.orderService.updateOrder(this.id, this.editOrderForm.value)
        .then(() => { // Changed res to () as res might not be used
          this.router.navigate(['/default/orders']); // Ensure navigation path is correct
        }, err => {
          console.log(err);
        });
    }
  }

  /* Reset form */
  resetForm() {
    this.editOrderForm.reset();
    Object.keys(this.editOrderForm.controls).forEach(key => {
      this.editOrderForm.controls[key].setErrors(null);
    });
  }

  getTotal() {
    // Implement total calculation based on form items if needed
    // This might involve iterating over itemForms and summing item_cost * quantity
  }
}
