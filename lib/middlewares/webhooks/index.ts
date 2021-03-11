import Router                               from '@koa/router'
import logger                               from '../../../lib/utils/logger'
import { setupWebhooks }                    from './setup'
import { each }                             from '../../../lib/utils/async'
import { IntegrationsApi }                  from 'sunshine-conversations-client'
import { GoodChatConfig }                   from '../../../lib/typings/goodchat'
import { WebhookEventBase, WebhookPayload } from '../../../lib/typings/webhook_types'

const { info } = logger('webhooks');

interface WebhooksParams {
  config:   GoodChatConfig,
  callback: (event: WebhookEventBase) => unknown
}

/**
 * Creates all the necessary webhooks required by Smooch
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default function(params: WebhooksParams) {
  const { config, callback }    = params;
  const router                  = new Router({ prefix: '/webhooks' });
  const integrationApi          = new IntegrationsApi();

  info('mouting webhook api');

  router.post('/connect', async (ctx) => {
    ctx.body    = await setupWebhooks(config);
    ctx.status  = 200;
  });

  router.head('/trigger', (ctx) => {
    ctx.status = 200
  });

  router.post('/trigger', async (ctx) => {
    const payload = ctx.request.body as WebhookPayload

    await each(payload.events, callback);

    ctx.body    = { ok: true };
    ctx.status  = 200;
  });

  router.get('/integrations', async (ctx) => {
    const { integrations } = await integrationApi.listIntegrations(config.smoochAppId, { page: Object, filter: {} });

    ctx.body    = integrations;
    ctx.status  = 200;
  });

  return router.routes();
}
