import { ShopifyCoreModule } from '@rh-nestjs-shopify/core';
import { Logger, Module } from '@nestjs/common';
import { ApiVersion, LogSeverity } from '@shopify/shopify-api';
import { MemorySessionStorageModule } from './session-storage/memory-session-storage.module';
import { MemorySessionStorage } from './session-storage/memory.session-storage';

const logger = new Logger('Shopify API');

export const PREFIX_PARAM_SCOPE = 'scope';

@Module({
  imports: [
    ShopifyCoreModule.forRootAsync({
      imports: [MemorySessionStorageModule],
      useFactory: (sessionStorage: MemorySessionStorage) => ({
        apiKey: 'foo',
        apiSecretKey: 'bar',
        apiVersion: ApiVersion.Unstable,
        hostName: 'localhost:8082',
        hostScheme: 'https' as const,
        isEmbeddedApp: true,
        isPrivateApp: false,
        scopes: ['write_products'],
        sessionStorage: sessionStorage as any,
        logger: {
          log: async (_severity, msg) => logger.log(msg),
          httpRequests: false,
          level: LogSeverity.Error,
          timestamps: false,
        },
        multiScopes: [{ key: 'default', scopes: ['write_products'] }],
        prefixParamScope: PREFIX_PARAM_SCOPE,
      }),
      inject: [MemorySessionStorage],
    }),
  ],
  exports: [ShopifyCoreModule],
})
export class ShopifyInitializerModule {}
