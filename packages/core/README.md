# @rh-nestjs-shopify/core

A wrapper for [@shopify/shopify-node-api](https://github.com/Shopify/shopify-node-api) to setup your Shopify context in a NestJS application.

# Installation

Install package using NPM:

```
npm i @shopify/shopify-api @rh-nestjs-shopify/core
```

or using Yarn:

```
yarn add @shopify/shopify-api @rh-nestjs-shopify/core
```

# Usage

From your application root module, import the `ShopifyCoreModule` using `forRoot`, or if you have dynamic config using `forRootAsync`:

```ts
// app.module.ts
@Module({
  imports: [
    ShopifyCoreModule.forRoot({
      apiKey: 'foo',
      apiSecretKey: 'bar',
      apiVersion: ApiVersion.Unstable,
      hostName: 'localhost:8081',
      isEmbeddedApp: true,
      scopes: ['test_scope'],
    }),
  ],
})
export class AppModule {}
```

or if you want to inject your configuration dynamically (maybe using `@nestjs/config`), use `forRootAsync`:

```ts
// app.module.ts
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ShopifyCoreModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          apiKey: configService.get('SHOPIFY_API_KEY'),
          apiSecretKey: configService.get('SHOPIFY_API_SECRET'),
          apiVersion: ApiVersion.Unstable,
          hostName: configService.get('HOST').replace(/https:\/\//, ''),
          isEmbeddedApp: true,
          scopes: ['test_scope'],
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

# Custom session storage

The library allows your to inject your own session storage. For instance, if you use Redis based session storage. You could create an `@Injectable()` class that implements the `SessionStorage` interface. And use this injected class in your config:

```ts
// app.module.ts
import { ConfigService } from '@nestjs/config';
import { MyRedisSessionStorage } from './my-redis-session-storage';

@Module({
  imports: [
    ShopifyCoreModule.forRootAsync({
      useFactory: async (configService: ConfigService, sessionStorage: MyRedisSessionStorage) => {
        return {
          apiKey: configService.get('SHOPIFY_API_KEY'),
          apiSecret: configService.get('SHOPIFY_API_SECRET'),
          apiVersion: ApiVersion.Unstable,
          hostName: configService.get('HOST').replace(/https:\/\//, ''),
          isEmbeddedApp: true,
          scopes: ['test_scope'],
          sessionStorage,
        };
      },
      provide: [MyRedisSessionStorage],
      inject: [ConfigService, MyRedisSessionStorage],
    }),
  ],
})
export class AppModule {}
```

```ts
// my-redis-session-storage.ts
import { Injectable } from '@nestjs/common';
import { SessionStorage } from '@nestjs-shopify/core';
import { Session } from '@shopify/shopify-api';

@Injectable()
export class MyRedisSessionStorage implements SessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    // ... implement your redis store logic
  }

  async loadSession(id: string): Promise<Session | undefined> {
    // ... implement your redis load logic
  }

  async deleteSession(id: string): Promise<boolean> {
    // ... implement your redis delete logic
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    // ... implement your redis multi-delete logic
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    // ... implement your redis multi-find logic
  }
}
```

# CSP middleware

The library provides a CSP middleware that you can use to protect your application from XSS attacks. The middleware is not applied by default. To make use of this middleware, add the following to your application root module:

```ts
// app.module.ts
import { ShopifyCoreModule, ShopifyCspMiddleware } from '@nestjs-shopify/core';
import { Module, NestModule } from '@nestjs/common';

@Module({
  imports: [
    ShopifyCoreModule.forRoot({ ... }),
    // ...
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the middleware to all routes
    consumer.apply(ShopifyCspMiddleware).forRoutes('*');

    // Or apply the middleware to specific routes
    consumer
      .apply(ShopifyCspMiddleware)
      .exclude('cats')
      .forRoutes({ path: 'ab*cd', method: RequestMethod.ALL });
  }
}
```
