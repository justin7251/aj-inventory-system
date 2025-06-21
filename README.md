# AJ Inventory System

AJ Inventory System is an inventory management software system for tracking inventory levels, orders, sales, and deliveries. It can also be used in the manufacturing industry to create a work order. It is a tool for organizing inventory data that was generally stored in hard-copy form or in spreadsheets.

## Key Features

* Dashboard for an overview of inventory status.
* Management of inventory items.
* Order processing and tracking.
* Support for product forms and details.
* Purchase order management.

## Built With

* [Angular](https://angular.io/) (v20.0.2) - The Angular framework used
* [Angular Material](https://material.angular.io/) (v20.0.2) - Material Design components for Angular
* [AngularFire](https://github.com/angular/angularfire/) (v18.0.1) with Firebase (v10.14.1) - Used for Firebase database service

This project was generated with [Angular CLI](https://github.com/angular/angular-cli).

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build --prod --output-hashing all --aot` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Deployment

Angular applications can be deployed to various hosting providers.
For detailed information and deployment options, refer to the official Angular documentation on deployment: [Angular Deployment Guide](https://angular.dev/tools/cli/deployment)

## Running unit tests

Unit tests are crucial for ensuring code quality and stability. They verify individual components and services work as expected.

### 1. Install Dependencies

Before running tests, ensure all project dependencies are installed. Navigate to the project's root directory in your terminal and run:

```bash
npm install
```

**Note on Peer Dependencies:** This project currently has some peer dependency conflicts. If `npm install` fails or you encounter issues, you might need to run the following command instead:

```bash
npm install --legacy-peer-deps
```
It's recommended to address the underlying peer dependency conflicts for a cleaner build in the long term.

### 2. Execute Tests Locally

To run the unit tests via [Karma](https://karma-runner.github.io), use the following command:

```bash
npx ng test
```

This will:
* Compile the application.
* Launch a browser (usually Chrome) to run the tests.
* Display test results in the terminal and the browser.
* Watch for file changes and re-run tests automatically (useful during development).

**Interpreting Results:**
*   **SUCCESS:** Look for a message indicating all tests passed (e.g., "Executed X of X SUCCESS").
*   **FAILURES:** The terminal will detail which tests failed and why, helping you pinpoint issues.

### 3. Execute Tests for CI/Automation

For continuous integration (CI) pipelines or automated environments where no browser UI is available, use:

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```
*   `--watch=false`: Ensures tests run once and the process exits.
*   `--browsers=ChromeHeadless`: Runs tests in a headless Chrome browser.

### Known Issues & Current Status

While many improvements have been made to the test suite, please be aware of the following known complex issues that are pending resolution:

*   **Firestore V9 Mocking:** The tests for `ItemService.spec.ts` (which interacts heavily with Firestore) require a more robust mocking strategy for the Firebase V9 SDK.
*   **"Standalone Component" Errors:** Some tests report components as "standalone" unexpectedly, which may point to deeper configuration issues in the test environment.

Addressing these issues is important for achieving a fully stable and reliable test suite.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

## Getting Started

1. Clone the repository.
2. Navigate to the project directory: `cd AJ_Inventory_System`
3. Install dependencies: `npm install`

This will install all necessary packages including Angular, Angular Material, Firebase, Highcharts, Bootstrap, and Font Awesome as defined in `package.json`.
