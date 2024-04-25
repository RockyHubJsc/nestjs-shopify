import { ApiVersion } from '@shopify/shopify-api';
import { ShopifyCoreModule } from '../../src/core.module';
import { mockLogger } from './mock-logger';
import { mockSessionStorage } from './mock-session-storage';
import { ShopifyCoreOptions } from '../../src';

export const mockedShopifyCoreOptions: ShopifyCoreOptions = {
  apiKey: 'foo',
  apiSecretKey: 'bar',
  apiVersion: ApiVersion.Unstable,
  scopes: ['test_scope'],
  hostName: 'localhost:3001',
  hostScheme: 'http' as const,
  isEmbeddedApp: true,
  sessionStorage: mockSessionStorage,
  logger: mockLogger,
  multiScopes: [{ key: 'default', scopes: ['test_scope'] }],
  prefixParamScope: 'scope',
};

export const MockShopifyCoreModule = ShopifyCoreModule.forRoot(
  mockedShopifyCoreOptions,
);
