import logger               from '../../utils/logger'
import { read }             from '../../utils/env'
import { prefixProtocol }   from '../../utils/http'
import os                   from 'os'
import _                    from 'lodash'
import { GoodChatConfig }   from '../../../lib/typings/goodchat'
import { WebhookEventType } from '../../../lib/typings/webhook_types'
import {
  Integration,
  IntegrationsApi,
  WebhooksApi
} from 'sunshine-conversations-client'

const { info } = logger('webhooks');

const ENV = read('NODE_ENV', 'development')
const DEV = /dev/.test(ENV);

const ALL_TRIGGERS = [
  "conversation:create",
  "conversation:join",
  "conversation:read",
  "conversation:message",
  "conversation:leave",
  "conversation:message:delivery:channel",
  "conversation:message:delivery:failure",
  "conversation:message:delivery:user",
  "conversation:postback",
  "conversation:read",
  "conversation:typing",
  "user:merge"
] as WebhookEventType[]

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
 * If the current server already has a custom integration, returns true
 *
 * @export
 * @param {string} appId
 * @returns {Promise<Boolean>}
 */
export async function integrationExists(appId : string) : Promise<Boolean> {
  return (await getCustomIntegration(appId)) !== null;
}

/**
 * Deletes the custom integration of the running server
 *
 * @export
 * @param {string} appId
 */
export async function clearIntegration(appId : string) {
  const api       = new IntegrationsApi();
  const existing  = await getCustomIntegration(appId)

  if (existing) {
    info(`deleting previous integration record`)
    await api.deleteIntegration(appId, existing.id)
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
 * Returns true if the current server's webhook trigger is registered on smooch.io
 *
 * @export
 * @param {GoodChatConfig} config
 * @returns {Promise<Boolean>}
 */
export async function webhookExists(config : GoodChatConfig) : Promise<Boolean> {
  const api           = new WebhooksApi();
  const endpoint      = webhookTarget(config);
  const integration   = await getCustomIntegration(config.smoochAppId);

  if (integration === null) {
    return false;
  }

  const { webhooks }  = await api.listWebhooks(config.smoochAppId, integration.id);

  return Boolean(_.find(webhooks, ['target', endpoint]));
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

  await clearIntegration(config.smoochAppId);

  info(`creating custom integration "${INTEGRATION_NAME}"`);

  const { integration } = await api.createIntegration(config.smoochAppId, {
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

  info('webhook registered')

  return integration;
}
