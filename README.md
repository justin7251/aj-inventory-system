# AJ Inventory System

Inventory management system is a software system for tracking inventory levels, orders, sales and deliveries. It can also be used in the manufacturing industry to create a work order. It is a tool for organizing inventory data that was generally stored in hard-copy form or in spreadsheets.

## Built With

* [Angular](https://angular.io/) - The Angular framework used
* [Angular Material](https://material.angular.io/) - Material Design components for Angular
* [AngularFire](https://github.com/angular/angularfire/) - Angular Fire is used Firebase as a database service


This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 10.0.0.

## Upgrade Angular 8 to 10
In this project, I upgraded the Angular version from 8 to 10, which took me 3 hours.
There are many problems with the upgrade. The `ng update` function shows that all packages are up to date. Therefore, I have to manually update `core`, `cli` and many small packages.

Manually update the software package:
1. npm outdate  
2. manually update pack.json  
3. delete package-lock.json  
4. npm i @package@10.0.1  
5. npm outdate // check its updated  
6. ng update //check missing package  
7. doing this all overagain  

If needed, you need to delete node_modules


## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build --prod --output-hashing all --aot` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

## Package install

npm i @angular-devkit/build-angular  
npm i typescript  
npm i @angular/compiler-cli  
npm i @angular/compiler  
npm i @angular/core  

ng add @angular/material  
npm install highcharts-angular --save  
npm install highcharts --save  
npm i @angular/flex-layout @angular/cdk  
npm install --save firebase @angular/fire  
npm i bootstrap  
npm i font-awesome  


##  Delete node_module in window
npm i rimraf  
rimraf node_modules

## update all package
npm update -g
