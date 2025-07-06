import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from "@angular/forms";
import { ProductService } from '../services/product.service'; // Changed ItemService to ProductService
import { MatDialog } from '@angular/material/dialog';
import { BarcodeScannerComponent } from '../../shared/components/barcode-scanner/barcode-scanner.component';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  productForm: UntypedFormGroup;
  ProductType: any = ['Paperback', 'Case binding', 'Perfect binding', 'Saddle stitch binding', 'Spiral binding'];
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    public fb: UntypedFormBuilder,
    public productService: ProductService, // Changed db to productService
    public dialog: MatDialog
  ) { }

  ngOnInit() {
    this.submitProductForm();
  }

  submitProductForm() {
    this.productForm = this.fb.group({
      product_no: ['', [Validators.required]],
      product_name: ['', [Validators.required]],
      color: ['', [Validators.required]],
      quantity: ['', [Validators.required]],
      price: ['', [Validators.required]],
      costPrice: ['', [Validators.required]],
      barcode: [''] // Added barcode form control
    });
  }

  openBarcodeScanner(): void {
    const dialogRef = this.dialog.open(BarcodeScannerComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productForm.patchValue({ barcode: result });
      }
    });
  }

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
      // Changed db.AddProduct to productService.addProduct
		this.productService.addProduct(this.productForm.value).then(res => {
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
