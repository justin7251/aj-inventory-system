// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebaseConfig : {
    apiKey: "AIzaSyAy-7b0_lKY3lmyqdhkRGc35YCZcGXn1Hw",
    authDomain: "j-target.firebaseapp.com",
    databaseURL: "https://j-target.firebaseio.com",
    projectId: "j-target",
    storageBucket: "j-target.appspot.com",
    messagingSenderId: "876847456256",
    appId: "1:876847456256:web:4e6e36e3d9d7b6722778e5",
    measurementId: "G-P3Q9T80DF0"
  },
  ebayApiConfig: {
    endpoint: '', // Real API endpoint for eBay (leave empty if using mock)
    mockDataUrl: '/assets/mock-ebay-orders.json', // Path to local mock data
    apiKey: '' // Placeholder for actual API key if needed
  },
  shopifyApiConfig: {
    endpoint: '', // Real API endpoint for Shopify (e.g., 'https://your-shop-name.myshopify.com/admin/api/2023-10')
    mockDataUrl: '/assets/mock-shopify-orders.json', // Path to local mock data
    apiKey: '', // Placeholder for Shopify Access Token / API Key
    password: '' // Placeholder for Shopify App Password (if using Basic Auth for private app)
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
