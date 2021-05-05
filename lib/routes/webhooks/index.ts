import Router                                     from '@koa/router'
import logger                                     from '../../../lib/utils/logger'
import { setupWebhooks }                          from './setup'
import { each }                                   from '../../../lib/utils/async'
import { IntegrationsApi }                        from 'sunshine-conversations-client'
import { GoodChatAuthMode, GoodChatPermissions }  from '../../../lib/typings/goodchat'
import { WebhookEventBase, WebhookPayload }       from '../../../lib/typings/webhook_types'
import authenticate                               from '../../middlewares/authenticate'
import { KoaHelpers }                             from '../../utils/http'
import compose                                    from 'koa-compose'
import config                                     from '../../config'

const { info } = logger('webhooks');

interface WebhooksParams {
  callback: (event: WebhookEventBase) => unknown
}

/**
 * Creates all the necessary webhooks required by Smooch
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default function(params: WebhooksParams) {
  const { callback }    = params;
  const router          = new Router({ prefix: '/webhooks' });
  const integrationApi  = new IntegrationsApi();

  info('mouting webhook api');

  const authenticator = config.auth.mode === GoodChatAuthMode.NONE ?
    KoaHelpers.noop : authenticate([GoodChatPermissions.ADMIN]);

  /**
   *
   * When called, will connect to sunshine and magically set up all the webhooks
   *
   */
  router.post('/connect', authenticator, async (ctx) => {
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

  router.get('/integrations', authenticator, async (ctx) => {
    const { integrations } = await integrationApi.listIntegrations(config.smoochAppId, { page: Object, filter: {} });

    ctx.body    = integrations;
    ctx.status  = 200;
  });

  return compose([router.routes(), router.allowedMethods()])
}
