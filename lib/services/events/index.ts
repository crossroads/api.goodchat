/*
 * Event Service
 *
 * This service serves as a handler for incoming Webhook events
 * Each even has a custom handler in the `events/webhooks` folder
 * 
 * It also supports:
 *  - Registering additional emitters 
 *  - Traditional EventEmitter functionalities
 * 
 * Created on Thu Mar 11 2021
 * 
 * Copyright (c) 2021 Crossroads Foundation
 */

import EventEmitter                                   from "events"
import TypedEmitter                                   from "typed-emitter"
import requireDir                                     from 'require-dir'
import { WebhookEventBase, WebhookEventType }         from "../../typings/webhook_types"
import { each }                                       from "../../utils/async"

const emitter = new EventEmitter() as TypedEmitter<{
  "webhook" :  (ev: WebhookEventBase) => unknown
}>

type WebhookHandler = (ev: WebhookEventBase) => unknown

type WebhookHandlerDict = { [key in WebhookEventType]?: WebhookHandler[] }

const webhookHandlers : WebhookHandlerDict = {};

function getHandlersForType(type: WebhookEventType) : WebhookHandler[] {
  return webhookHandlers[type] || [];
}

/**
 * Adds a callback to handle an incoming webhook
 *
 * @export
 * @param {WebhookEventType} type
 * @param {WebhookHandler} handler
 */
export function registerWebhookHandler(type: WebhookEventType, handler: WebhookHandler) {
  const handlers = webhookHandlers[type] || []
  handlers.push(handler);
  webhookHandlers[type] = handlers;
}

/**
 * Handles
 *
 * @export
 * @param {WebhookEventBase} type
 * @param {WebhookPayload} payload
 */
export async function handleWebhookEvent(event: WebhookEventBase) {
  await each(getHandlersForType(event.type), (h : WebhookHandler) => h(event));

  emitter.emit('webhook', event);
}

// --- Load up handlers

requireDir('./webhooks')

export default emitter;
