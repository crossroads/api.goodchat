import config                                   from "../config"
import { handleWebhookEvent }                   from "../services/events"
import { WebhookEventBase, WebhookEventType }   from '../typings/webhook_types'
import { createJob }                            from './job'

export default createJob<WebhookEventBase, any, WebhookEventType>('webhooks', async job => {
  //
  // Process new webhook event
  //
  await handleWebhookEvent(job.data, config);
})
