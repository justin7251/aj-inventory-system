import { Component, OnInit, ViewChild } from '@angular/core';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from "@angular/forms";
import { ItemService } from '../services/item.service';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
 	visible = true;
	selectable = true;
	removable = true;
  addOnBlur = true;
  
	// @ViewChild('chipList') chipList;
 	// @ViewChild('resetProductForm') myNgForm;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
	productForm: UntypedFormGroup;
	ProductType: any = ['Paperback', 'Case binding', 'Perfect binding', 'Saddle stitch binding', 'Spiral binding'];
	errorMessage: string = '';
	successMessage: string = '';

	constructor(
	    public fb: UntypedFormBuilder,
	    public db: ItemService,
	) { }


  ngOnInit() { 
    	/*this.bookApi.GetBookList();*/
    this.submitProductForm();
  }


  /* Reactive book form */
  submitProductForm() {
    this.productForm = this.fb.group({
		product_no: ['', [Validators.required]],
		product_name: ['', [Validators.required]],
		color: ['', [Validators.required]],
		quantity: ['', [Validators.required]],
		price: ['', [Validators.required]],
    })
  }

  /* Get errors */
  public handleError = (controlName: string, errorName: string) => {
    return this.productForm.controls[controlName].hasError(errorName);
  }
  
  /* Date */
/*  formatDate(e) {
    var convertDate = new Date(e.target.value).toISOString().substring(0, 10);
    this.productForm.get('publication_date').setValue(convertDate, {
      onlyself: true
    })
  }*/

  /* Reset form */
  resetForm() {
    this.productForm.reset();
    Object.keys(this.productForm.controls).forEach(key => {
      this.productForm.controls[key].setErrors(null)
    });
  }

  /* Add Product */
  addProduct() {
    if (this.productForm.valid && this.productForm.value) {
  		this.db.AddProduct(this.productForm.value).then(res => {
        this.errorMessage = "";
        this.successMessage = "Record has been created";
      }, err => {
        console.log(err);
        this.errorMessage = err.message;
        this.successMessage = "";
      })
  		this.resetForm();
    }
  }
}
