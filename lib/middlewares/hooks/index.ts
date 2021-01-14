import Router              from '@koa/router'
import { GoodChatAuthMode, GoodChatConfig }  from '../../types';
import {
  WebhooksApi,
  IntegrationsApi,
  Page,
  IntegrationListFilter
} from 'sunshine-conversations-client'

/**
 * Creates all the necessary webhooks required by Smooch
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default async function(config: GoodChatConfig) {
  const router        = new Router();
  const webhooks      = new WebhooksApi();
  const integrations  = new IntegrationsApi();

  // webhooks.listWebhooks(config.smoochAppId)
  // const res = await integrations.listIntegrations(config.smoochAppId, {
  //   page: new Page(),
  //   filter: new IntegrationListFilter()
  // });

  // console.log(res);


  return router.routes();
}
