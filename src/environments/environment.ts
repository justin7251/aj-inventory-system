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
  },
  shippoApiConfig: {
    endpoint: 'https://api.goshippo.com/', // Real Shippo API endpoint
    mockDataUrl: '', // No mock data for Shippo in this example, service will have hardcoded mocks
    apiKey: 'shippo_test_abcdefghijklmnopqrstuvwxyz123', // Placeholder for actual Shippo API key (e.g., shippo_live_xxxxxxxx or shippo_test_xxxxxxx)
    apiMocking: false // To explicitly control if service should use mock or attempt real call
  },
  upsApiConfig: {
    endpoint: 'https://wwwcie.ups.com/api/', // UPS Customer Integration Environment (CIE) for testing
    // endpoint: 'https://onlinetools.ups.com/api/', // UPS Production endpoint
    mockDataUrl: '', // Service will have hardcoded mocks
    apiKey: 'YOUR_UPS_API_KEY_HERE', // Placeholder for UPS Access Key / API Key
    username: 'YOUR_UPS_USERNAME', // Placeholder for UPS Account Username
    password: 'YOUR_UPS_PASSWORD', // Placeholder for UPS Account Password
    accountNumber: 'YOUR_UPS_ACCOUNT_NUMBER', // Placeholder for UPS Shipper Number
    apiMocking: true // To explicitly control if service should use mock or attempt real call
  },
  amazonMwsApiConfig: {
    endpoint: 'https://mws.amazonservices.com',
    mockDataUrl: '/assets/mock-amazon-orders.json',
    apiKey: '',
    apiMocking: true
  },
  fedexApiConfig: {
    endpoint: 'https://wsbeta.fedex.com:443/web-services',
    mockDataUrl: '',
    apiKey: '',
    apiMocking: true
  },
  quickbooksApiConfig: {
    endpoint: 'https://sandbox-quickbooks.api.intuit.com',
    mockDataUrlPrefix: '/assets/mocks/quickbooks-',
    apiKey: '',
    apiMocking: true
  },
  xeroApiConfig: {
    endpoint: 'https://api.xero.com/api.xro/2.0',
    mockDataUrlPrefix: '/assets/mocks/xero-',
    apiKey: '',
    apiMocking: true
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
