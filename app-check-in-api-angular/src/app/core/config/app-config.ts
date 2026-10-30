import { EnvironmentProviders, InjectionToken, inject, provideAppInitializer } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  /** Prefix of every API call. Empty means same origin (dev-server proxy or the nginx reverse proxy). */
  apiBaseUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => ({ apiBaseUrl: environment.apiBaseUrl }),
});

/** Overrides the build-time defaults with `/config.json`, so one image can run against any API without a rebuild. */
export function provideAppConfig(): EnvironmentProviders {
  return provideAppInitializer(async () => {
    const config = inject(APP_CONFIG);
    try {
      const response = await fetch('config.json', { cache: 'no-store' });
      const isJson = response.headers.get('content-type')?.includes('json') ?? false;
      if (response.ok && isJson) {
        const loaded = (await response.json()) as Partial<AppConfig>;
        if (typeof loaded.apiBaseUrl === 'string') config.apiBaseUrl = loaded.apiBaseUrl;
      }
    } catch {
      // Keep the build-time defaults.
    }
  });
}
