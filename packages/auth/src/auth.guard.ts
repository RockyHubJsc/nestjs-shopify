import {
  InjectShopify,
  InjectShopifySessionStorage,
  SessionStorage,
} from '@nestjs-shopify/core';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InvalidSession, Session, Shopify } from '@shopify/shopify-api';
import { IncomingMessage, ServerResponse } from 'http';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AUTH_MODE_KEY } from './auth.constants';
import { ShopifyAuthException } from './auth.errors';
import { AccessMode, ShopifySessionRequest } from './auth.interfaces';
import {
  getShopFromRequest,
  RequestLike,
} from './utils/get-shop-from-request.util';
import { hasValidAccessToken } from './utils/has-valid-access-token.util';

@Injectable()
export class ShopifyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ShopifyAuthGuard.name);

  constructor(
    @InjectShopify()
    private readonly shopifyApi: Shopify,
    @InjectShopifySessionStorage()
    private readonly sessionStorage: SessionStorage,
    private readonly reflector: Reflector
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const { accessMode, session } = await this.getSessionDataFromContext(ctx);

    if (session && session.isActive(this.shopifyApi.config.scopes)) {
      // We assign the session to the request for further usage in
      // our controllers/decorators
      this.assignSessionToRequest(ctx, session);

      return true;
    }

    const req = ctx
      .switchToHttp()
      .getRequest<IncomingMessage | FastifyRequest>();
    const shop = getShopFromRequest(req as RequestLike, session);

    if (shop) {
      throw new ShopifyAuthException(
        'Reauthorization Required',
        shop,
        accessMode
      );
    }

    return false;
  }

  private assignSessionToRequest(
    ctx: ExecutionContext,
    session: Session | undefined
  ) {
    const req = ctx
      .switchToHttp()
      .getRequest<ShopifySessionRequest<IncomingMessage | FastifyRequest>>();
    req.shopifySession = session;
  }

  private async getSessionDataFromContext(ctx: ExecutionContext) {
    const accessMode = this.getAccessModeFromContext(ctx);

    const http = ctx.switchToHttp();
    const request = http.getRequest<IncomingMessage | FastifyRequest>();
    const response = http.getResponse<ServerResponse | FastifyReply>();
    const req = request instanceof IncomingMessage ? request : request.raw;
    const res = response instanceof ServerResponse ? response : response.raw;

    const isOnline = accessMode === AccessMode.Online;
    let session: Session | undefined;

    try {
      const sessionId = await this.shopifyApi.session.getCurrentId({
        rawRequest: req,
        rawResponse: res,
        isOnline,
      });

      if (!sessionId) {
        throw new InvalidSession('No session found');
      }

      session = await this.sessionStorage.loadSession(sessionId);

      if (session && !(await hasValidAccessToken(this.shopifyApi, session))) {
        session = undefined;
      }
    } catch (err) {
      this.logger.error(err);
      session = undefined;
    }

    return {
      accessMode,
      session,
    };
  }

  private getAccessModeFromContext(ctx: ExecutionContext) {
    return this.reflector.getAllAndOverride<AccessMode>(AUTH_MODE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
  }
}
