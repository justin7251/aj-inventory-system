export const environment = {
  production: true,
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
    endpoint: 'https://api.ebay.com/sell/fulfillment/v1/order', // Example real API endpoint
    mockDataUrl: '', // No mock data in production
    apiKey: 'YOUR_EBAY_API_KEY_HERE' // Placeholder for actual API key
  },
  shopifyApiConfig: {
    endpoint: 'https://your-shop-name.myshopify.com/admin/api/2024-04', // Replace with your actual Shopify API endpoint and version
    mockDataUrl: '', // No mock data in production
    apiKey: 'YOUR_SHOPIFY_API_ACCESS_TOKEN_HERE', // Or API Key for public apps
    password: 'YOUR_SHOPIFY_APP_PASSWORD_OR_API_SECRET_HERE' // If using private app or specific auth
  },
  shippoApiConfig: {
    endpoint: 'https://api.goshippo.com/', // Real Shippo API endpoint
    mockDataUrl: '',
    apiKey: 'YOUR_SHIPPO_LIVE_API_KEY_HERE', // Placeholder for actual LIVE Shippo API key
    apiMocking: false // In production, this should ideally be false to use live API
  },
  upsApiConfig: {
    endpoint: 'https://onlinetools.ups.com/api/', // UPS Production endpoint
    mockDataUrl: '',
    apiKey: 'YOUR_UPS_LIVE_API_KEY_HERE', // Placeholder for UPS Access Key / API Key
    username: 'YOUR_UPS_USERNAME',
    password: 'YOUR_UPS_PASSWORD',
    accountNumber: 'YOUR_UPS_ACCOUNT_NUMBER',
    apiMocking: false // In production, this should ideally be false
  },
  amazonMwsApiConfig: {
    endpoint: 'https://mws.amazonservices.com',
    mockDataUrl: '',
    apiKey: 'YOUR_AMAZON_API_KEY_HERE',
    apiMocking: false
  },
  fedexApiConfig: {
    endpoint: 'https://ws.fedex.com:443/web-services',
    mockDataUrl: '',
    apiKey: 'YOUR_FEDEX_API_KEY_HERE',
    apiMocking: false
  },
  quickbooksApiConfig: {
    endpoint: 'https://quickbooks.api.intuit.com',
    mockDataUrlPrefix: '',
    apiKey: 'YOUR_QUICKBOOKS_API_KEY_HERE',
    apiMocking: false
  },
  xeroApiConfig: {
    endpoint: 'https://api.xero.com/api.xro/2.0',
    mockDataUrlPrefix: '',
    apiKey: 'YOUR_XERO_API_KEY_HERE',
    apiMocking: false
  }
};
