import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, UntypedFormArray, Validators } from '@angular/forms';
// User item service for now
import { ItemService } from '../services/item.service';
import { Order } from '../model/order.model';

@Component({
  selector: 'app-order-edit',
  templateUrl: './order-edit.component.html',
  styleUrls: ['./order-edit.component.scss']
})
export class OrderEditComponent implements OnInit {
	editOrderForm: UntypedFormGroup;
	items: [];
	id: string;
  start: boolean = true;
  
	constructor(
    private router: Router,
    private route: ActivatedRoute,
    public db: ItemService,
		private fb: UntypedFormBuilder
	) {
	    this.id = this.route.snapshot.paramMap.get('id');
		this.db.GetOrder(this.id).subscribe(data => {
			if (this.start) {
				for (let i = 0; i < data['items'].length; ++i) {
					this.addItem();
				}
				this.start = false;
			}
	    	this.editOrderForm.patchValue(data);
	    });
	}

  ngOnInit(): void {
    this.updateOrderForm();
  }

  /* Update form */
	updateOrderForm(){
		this.editOrderForm = this.fb.group({
			customer_name: ['', Validators.required ],
			telephone: ['', Validators.required ],
			delivery_address: '',
			payment_type: ['', Validators.required ],
			delivery_cost: '',
			discount: '',
			items: this.fb.array([]),
			total_cost: ['', Validators.required ]
		})
	}

	get itemForms() {
		return this.editOrderForm.get('items') as UntypedFormArray
	}

	addItem() {
		const item = this.fb.group({
			name: ['', Validators.required ],
			product_no: ['', Validators.required ],		
			color: '',
			quantity: ['', Validators.required ],
			item_cost: ['',Validators.required],
		})
		this.itemForms.push(item);
	}


	deleteItem(i) {
		this.itemForms.removeAt(i);
	}

	onSubmit(value) {
		if (this.editOrderForm.valid) {
		    this.db.UpdateOrder(this.id, value)
		    .then(res => {
		    	this.router.navigate(['/order']);
		    }, err => {
	       		console.log(err);
	    	})
		}
	}

	/* Reset form */
	resetForm() {
		this.editOrderForm.reset();
		Object.keys(this.editOrderForm.controls).forEach(key => {
		  this.editOrderForm.controls[key].setErrors(null)
		});
	}

	getTotal() {

	}


}
