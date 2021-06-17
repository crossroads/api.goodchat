/*
 * This function handles the incoming Webhook events from sunshine:
 *  - "conversation:message:delivery:channel"
 *  - "conversation:message:delivery:user"
 *  - "conversation:message:delivery:failure"
 *
 * This event is fired when a message has been successfully delivered to a user or failed to
 *
 * Actions taken:
 *  - Find the message based on the sunshineMessageId
 *  - Update its customerDeliveryStatys to either 'DELIVERED' or 'FAILED'
 *
 * Reference: https://docs.smooch.io/rest/#operation/eventWebhooks
 *
 */

import { registerWebhookHandler }  from '..'
import { throwNotFound }           from '../../../utils/errors';
import { DeliveryStatus }          from "@prisma/client"
import * as i18nService            from '../../../services/i18n'
import  db                         from "../../../db"
import _                           from "lodash"
import {
  MessageDeliveryEvent,
  WebhookEventBase,
  WebhookEventType
} from "../../../typings/webhook_types";

const i18n = i18nService.initialize();

/**
 * Webhook handler for message delivery status
 *
 * @export
 * @param {MessageDeliveryEvent} event
 * @returns {Promise<void>}
 */
export async function updateMessageDelivery(event: WebhookEventBase) : Promise<void> {
  const { payload }     = <MessageDeliveryEvent>event;
  const failure         = event.type === WebhookEventType.DELIVERY_FAILURE
  const success         = !failure
  const deliveryStatus  = failure ? DeliveryStatus.FAILED : DeliveryStatus.DELIVERED

  const error = success ? null : _.get(payload, 'error.message', i18n.__('errors.delivery_failure'));

  const message = await db.message.findUnique({
    where: { sunshineMessageId: payload.message.id },
  });

  if (!message) throwNotFound();

  await db.message.update({
    where: { id: message.id },
    data: {
      customerDeliveryError: error,
      customerDeliveryStatus: deliveryStatus
    }
  });
}

registerWebhookHandler(WebhookEventType.DELIVERY_CHANNEL, updateMessageDelivery);
registerWebhookHandler(WebhookEventType.DELIVERY_USER, updateMessageDelivery);
registerWebhookHandler(WebhookEventType.DELIVERY_FAILURE, updateMessageDelivery);
