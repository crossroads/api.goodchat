import Router               from '@koa/router'
import { GoodChatConfig }   from '../../types'
import logger               from '../../utils/logger'
import {
  webhookExists,
  setupWebhooks
} from './setup'
import {
  WebhooksApi,
  IntegrationsApi,
  Page,
  IntegrationListFilter,
} from 'sunshine-conversations-client'

const FETCH_OPTS = {
  page: new Page(),
  filter: new IntegrationListFilter()
}

const { info } = logger('webhooks');

interface WebhooksParams {
  config:   GoodChatConfig,
  callback: (trigger: string, payload: any) => any
}

/**
 * Creates all the necessary webhooks required by Smooch
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default async function(params: WebhooksParams) {
  const { config, callback }    = params;
  const router                  = new Router({ prefix: '/webhooks' });
  const webhooksApi             = new WebhooksApi();
  const integrationApi          = new IntegrationsApi();

  info('mouting webhook api');

  const readers = {
    integrations: () => integrationApi.listIntegrations(config.smoochAppId, FETCH_OPTS),
    webhooks: (integrationId: string) => webhooksApi.listWebhooks(config.smoochAppId, integrationId)
  }

  router.post('/connect', async (ctx) => {
    ctx.body    = await setupWebhooks(config);
    ctx.status  = 200;
  });

  router.post('/trigger', async (ctx) => {
    ctx.body    = { ok: true };
    ctx.status  = 200;
  });

  router.get('/integrations', async (ctx) => {
    const { integrations } = await readers.integrations();

    ctx.body    = integrations;
    ctx.status  = 200;
  });

  return router.routes();
}
