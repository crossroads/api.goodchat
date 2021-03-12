import { Factory }      from 'fishery'
import _                from 'lodash'
import * as factories     from '..'
import { WebhookPayload } from '../../../lib/typings/webhook_types'

/**
 * Creates a fake WebhookPayload
 *
 * 
 * @type {Factory<WebhookPayload>}
 * @exports
 */
export const sunshineWebhookPayloadFactory = Factory.define<WebhookPayload>(opts => {
  return {
    app: {
      id: "fakeappid"
    },
    webhook: {
      id:       String(opts.sequence),
      version:  "2"
    },
    events: [factories.sunshineNewConversationEventFactory.build()]
  }
});
