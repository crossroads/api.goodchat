import { GoodChatConfig } from '../../types';
import logger             from '../../utils/logger';

import {
  WebhooksApi,
  IntegrationsApi,
  Page,
  IntegrationListFilter
} from 'sunshine-conversations-client'

const { info, error } = logger('webhooks');

export async function setupWebhooks(config: GoodChatConfig) {
  info('fetching integrations');

  

}
