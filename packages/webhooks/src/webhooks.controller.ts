import {
  BadRequestException,
  Controller,
  HttpCode,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  InjectShopify,
  ShopifyFactory,
  ShopifyHmac,
  ShopifyHmacType,
} from '@rh-nestjs-shopify/core';
import {
  HttpWebhookHandlerWithCallback,
  Shopify,
  ShopifyHeader,
} from '@shopify/shopify-api';
import { FastifyRequest } from 'fastify';
import type { IncomingMessage } from 'node:http';
import { SHOPIFY_WEBHOOKS_DEFAULT_PATH } from './webhooks.constants';

@Controller(SHOPIFY_WEBHOOKS_DEFAULT_PATH)
export class ShopifyWebhooksController {
  private readonly logger = new Logger('Webhook');

  constructor(
    @InjectShopify() private readonly shopifyFactory: ShopifyFactory,
  ) {}

  @Post()
  @HttpCode(200)
  @ShopifyHmac(ShopifyHmacType.Header)
  async handle(@Req() req: RawBodyRequest<IncomingMessage | FastifyRequest>) {
    const { rawBody } = req;
    if (!rawBody) {
      throw new InternalServerErrorException(
        'Enable `rawBody` option when creating Nest application.',
      );
    }

    const { domain, topic, webhookId } = this.getHeaders(req);
    const graphqlTopic = (topic as string).toUpperCase().replace(/\//g, '_');
    const webhookEntries = (
      this.shopifyFactory.getInstance() as Shopify
    ).webhooks.getHandlers(graphqlTopic) as HttpWebhookHandlerWithCallback[];

    if (webhookEntries.length === 0) {
      throw new NotFoundException(
        `No webhook is registered for topic ${topic}`,
      );
    }

    this.logger.log(`Received webhook "${graphqlTopic}"`);

    await Promise.all(
      webhookEntries.map((webhookEntry) =>
        webhookEntry.callback(
          graphqlTopic,
          domain as string,
          rawBody.toString(),
          webhookId as string,
        ),
      ),
    );
  }

  private getHeaders(req: IncomingMessage | FastifyRequest) {
    let topic: string | string[] | undefined;
    let domain: string | string[] | undefined;
    let webhookId: string | string[] | undefined;
    Object.entries(req.headers).map(([header, value]) => {
      switch (header.toLowerCase()) {
        case ShopifyHeader.Topic.toLowerCase():
          topic = value;
          break;
        case ShopifyHeader.Domain.toLowerCase():
          domain = value;
          break;
        case ShopifyHeader.WebhookId.toLowerCase():
          webhookId = value;
          break;
      }
    });

    const missingHeaders = [];
    if (!topic) {
      missingHeaders.push(ShopifyHeader.Topic);
    }
    if (!domain) {
      missingHeaders.push(ShopifyHeader.Domain);
    }
    if (!webhookId) {
      missingHeaders.push(ShopifyHeader.WebhookId);
    }

    if (missingHeaders.length) {
      throw new BadRequestException(
        `Missing one or more of the required HTTP headers to process webhooks: [${missingHeaders.join(
          ', ',
        )}]`,
      );
    }

    return {
      topic,
      domain,
      webhookId,
    };
  }
}
