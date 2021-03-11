import { expect, assert }     from 'chai'
import _                      from 'lodash'
import * as factories         from '../../factories'
import db                     from '../../../lib/db'
import { GoodchatApp }        from '../../../lib/typings/goodchat'
import {
  createGoodchatServer,
  TestAgent
} from '../../spec_helpers/agent'

const webhookEvent = factories.sunshineNewConversationEventFactory.build();
const webhookPayload = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] })

describe('On new conversation', () => {
  let agent : TestAgent
  let app   : GoodchatApp

  before(async () => {
    [app, agent] = await createGoodchatServer();
  })

  beforeEach(async () => {
    expect(await db.conversation.count()).to.eq(0)
    expect(await db.customer.count()).to.eq(0)
    await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
  });

  it('creates a Conversation record', async () => {
    expect(await db.conversation.count()).to.eq(1)

    const conversation = await db.conversation.findFirst({}) as any

    assert.isNotNull(conversation)
    expect(conversation.metadata).to.deep.eq({})
    expect(conversation.private).to.eq(false)
    expect(conversation.sunshineConversationId).to.eq(webhookEvent.payload.conversation.id)
    expect(conversation.source).to.eq(webhookEvent.payload.source.client.type)
    expect(await db.customer.findFirst({ where: { id: conversation.customerId } })).to.not.be.null
  })
  
  it('creates a Customer record', async () => {
    expect(await db.customer.count()).to.eq(1)

    const customer    = await db.customer.findFirst({}) as any
    const { givenName, surname, email } = webhookEvent.payload.user.profile;

    assert.isNotNull(customer)
    expect(customer.displayName).to.eq(`${givenName} ${surname}`);
    expect(customer.email).to.eq(email)
    expect(customer.externalId).to.be.null
    expect(customer.locale).to.eq('en')
    expect(customer.metadata).to.deep.eq({})
    expect(customer.sunshineUserId).to.eq(webhookEvent.payload.user.id)
  })
});
