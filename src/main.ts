import 'hammerjs';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { getApps, initializeApp } from 'firebase/app';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

if (!getApps().length) {
  initializeApp(environment.firebaseConfig);
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
