import logger               from '../../utils/logger'
import { read }             from '../../utils/env'
import { prefixProtocol }   from '../../utils/http'
import os                   from 'os'
import _                    from 'lodash'
import { GoodChatConfig }   from '../../../lib/typings/goodchat'
import { WebhookEventType } from '../../../lib/typings/webhook_types'
import {
  Integration,
  IntegrationsApi
} from 'sunshine-conversations-client'

const { info } = logger('webhooks');

const ENV = read('NODE_ENV', 'development')
const DEV = /dev/.test(ENV);

const ALL_TRIGGERS = Object.values(WebhookEventType);

const INTEGRATION_NAME = DEV ?
  `[${ENV}] [${os.hostname()}] GoodChat Webhooks` :
  `[${ENV}] GoodChat Webhooks`

/**
 * Fetches the custom integration of the running server (if it exists)
 *
 * @export
 * @param {string} appId
 * @returns {(Promise<Integration|null>)}
 */
export async function getCustomIntegration(appId : string) : Promise<Integration|null> {
  const api = new IntegrationsApi();

  const { integrations }  = await api.listIntegrations(appId, { page: 0, filter: { types: "custom" } });

  return _.find(integrations, ['displayName', INTEGRATION_NAME]) || null;
}

/**
 * Deletes the custom integration of the running server
 *
 * @export
 * @param {GoodChatConfig} config
 */
export async function clearIntegration(config : GoodChatConfig) {
  const api       = new IntegrationsApi();
  const existing  = await getCustomIntegration(config.smoochAppId)

  if (existing) {
    info(`deleting previous integration record`)
    await api.deleteIntegration(config.smoochAppId, existing.id)
  }
}

/**
 * Returns the full url of the current server's webhook trigger
 *
 * @export
 * @param {GoodChatConfig} config
 * @returns {string}
 */
export function webhookTarget(config : GoodChatConfig) : string {
  return prefixProtocol(`${config.goodchatHost}/webhooks/trigger`);
}

/**
 * Stores webhookIntegrationSecret in the database
 */
async function storeWebhookIntegrationSecret(secret: string) {
  await db.webHookIntegrationSecret.create({
    data: { secret }
  })
}

/**
 * Recreates a fresh integration for the running server with a registered webhook
 *
 * @export
 * @param {GoodChatConfig} config
 * @returns {Promise<Integration>}
 */
export async function setupWebhooks(config: GoodChatConfig) : Promise<Integration> {
  const api         = new IntegrationsApi();
  const endpoint    = webhookTarget(config);

  await clearIntegration(config);

  info(`creating custom integration "${INTEGRATION_NAME}"`);

  const { response } = await api.createIntegrationWithHttpInfo(config.smoochAppId, {
    "type": "custom",
    "status": "active",
    "displayName": INTEGRATION_NAME,
    "webhooks": [{
      "target": endpoint,
      "triggers": ALL_TRIGGERS,
      "includeFullUser": true,
      "includeFullSource": true
    }]
  });

  const { integration } = response.body

  const { secret } = integration.webhooks[0]

  await storeWebhookIntegrationSecret(secret)

  info('webhook registered')

  return integration;
}
