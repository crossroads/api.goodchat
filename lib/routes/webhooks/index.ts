import Router, { Middleware }                                     from '@koa/router'
import logger                                     from '../../../lib/utils/logger'
import { getWebhookIntegrationSecret, setupWebhooks }                          from './setup'
import { each }                                   from '../../../lib/utils/async'
import { IntegrationsApi }                        from 'sunshine-conversations-client'
import { GoodChatAuthMode, GoodChatPermissions }  from '../../../lib/typings/goodchat'
import { WebhookEventBase, WebhookPayload }       from '../../../lib/typings/webhook_types'
import authenticate                               from '../../middlewares/authenticate'
import { KoaHelpers }                             from '../../utils/http'
import compose                                    from 'koa-compose'
import config                                     from '../../config'
import { minischema, MiniSchema }                 from '../../utils/assertions'

const { info } = logger('webhooks');

interface WebhooksParams {
  callback: (event: WebhookEventBase) => unknown
}

const webhookPayloadSchema : MiniSchema<WebhookPayload> = minischema({
  "app": ["object"],
  "webhook": ["object"],
  "events": ["array"]
})

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

  const webHookOriginValidator: Middleware = async (ctx, next) => {
    const xApiKey = ctx.request.header['x-api-key']
    if(!xApiKey) return ctx.status = 401

    const webhookIntegrationSecret = await getWebhookIntegrationSecret()
    if(!webhookIntegrationSecret) return ctx.status = 401

    if(xApiKey !== webhookIntegrationSecret) return ctx.status = 401

    return next()
  }

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

  router.post('/trigger', webHookOriginValidator, async (ctx) => {
    const payload = ctx.request.body;

    webhookPayloadSchema.validate(payload)

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
