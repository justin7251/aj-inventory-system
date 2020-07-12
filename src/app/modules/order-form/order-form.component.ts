import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FileUploader } from "ng2-file-upload";
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
// User item service for now
import { ItemService } from '../services/item.service';


@Component({
  selector: 'app-order-form',
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.scss']
})
export class OrderFormComponent implements OnInit {
	uid: string;
	items: [];
	total: number = 0;
	orderForm: FormGroup;
	errorMessage: string = '';
	successMessage: string = '';
	@ViewChild('resetOrderForm') myNgForm;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location : Location,
    public db: ItemService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.route.data.subscribe(routeData => {
			let data = routeData['data'];
			if (data) {
       			this.uid = data.uid;
			}
		});
		this.createForm();
	}

  createForm() {
		this.orderForm = this.fb.group({
			customer_name: ['', Validators.required ],
			telephone: ['', Validators.required ],
			delivery_address: '',
			payment_type: ['', Validators.required ],
			delivery_cost: '',
			discount: '',
			items: this.fb.array([]),
			total_cost: ['', Validators.required ]
		});
	}

	get itemForms() {
		return this.orderForm.get('items') as FormArray
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

	getTotal() {
	  /*console.log(this.itemForms.value.item);*/
	}

	deleteItem(i) {
		this.itemForms.removeAt(i);
	}

	onSubmit(value) {
		console.log('Submit');
		value.uid = this.uid;
		if (this.orderForm.valid) {
		    this.db.addOrder(value)
		    .then(res => {
		    	this.resetForm();
	   	    	this.errorMessage = "";
	       		this.successMessage = "Record has been created";
		    }, err => {
	       		console.log(err);
	       		this.errorMessage = err.message;
	       		this.successMessage = "";
	    	})
		}
	}

	/* Reset form */
	resetForm() {
		this.orderForm.reset();
		Object.keys(this.orderForm.controls).forEach(key => {
		  this.orderForm.controls[key].setErrors(null)
		});
	}
}
