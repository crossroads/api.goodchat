import { AuthorType, Staff }     from '.prisma/client'
import { waitForPubSub }         from '../../spec_helpers/utils'
import { PubSubEvent }           from '../../../lib/services/events/pubsub'
import * as factories            from '../../factories'
import { expect }                from 'chai'
import db                        from '../../../lib/db'
import _                         from 'lodash'

describe('Services/events', () => {
  describe('PubSub', () => {
    let user    : Staff

    beforeEach(async () => {
      user = await factories.staffFactory.create();
    })

    describe('Message events', () => {

      it('fires a MESSAGE created event when a message is created', async () => {
        const [[payload], message] = await Promise.all([
          waitForPubSub(PubSubEvent.MESSAGE),
          factories.messageFactory.create({})
        ])

        expect(payload).to.have.keys('action', 'message');
        expect(payload.action).to.eq('create');
        expect(payload.message.id).to.eq(message.id);
        expect(payload.message.content).to.deep.equal(message.content);
      })

      it('fires a MESSAGE created event when a message is created via an upsert', async () => {
        const conversation = await factories.conversationFactory.create({});
        const message = factories.messageFactory.build({ conversationId: conversation.id });

        const [[payload]] = await Promise.all([
          waitForPubSub(PubSubEvent.MESSAGE),
          db.message.upsert({
            where: { id: message.id },
            create: message,
            update: {}
          })
        ])

        expect(payload).to.have.keys('action', 'message');
        expect(payload.action).to.eq('create');
        expect(payload.message.id).to.eq(message.id);
        expect(payload.message.content).to.deep.equal(message.content);
      })

      it('fires multiple MESSAGE updated events for batch updateMany operations', async () => {
        await factories.messageFactory.createList(3, {
          createdAt: new Date(Date.now() - 6000)
        });

        const [events, result] = await Promise.all([
          waitForPubSub(PubSubEvent.MESSAGE, 3),
          db.message.updateMany({
            where: {},
            data: {
              metadata: { 'some': 'data' }
            }
          })
        ])

        expect(result).to.deep.equal({ count: 3 })

        events.forEach(payload => {
          expect(payload).to.have.keys('action', 'message');
          expect(payload.action).to.eq('update');
        })
      })

      it('fires multiple MESSAGE deleted events for batch deleteMany operations', async () => {
        await factories.messageFactory.createList(3);

        const [events, result] = await Promise.all([
          waitForPubSub(PubSubEvent.MESSAGE, 3),
          db.message.deleteMany({ where: {} })
        ]);

        expect(result).to.deep.equal({ count: 3 })

        events.forEach((payload) => {
          expect(payload).to.have.keys('action', 'message');
          expect(payload.action).to.eq('delete');
        })
      })

      it('fires a MESSAGE updated event when a message is updated via an upsert', async () => {
        const conversation = await factories.conversationFactory.create({});
        const message = await factories.messageFactory.create({ conversationId: conversation.id });

        expect(await db.message.count()).to.eq(1)

        const upsert = db.message.upsert({
          where: { id: message.id },
          create: _.omit(message, 'id'),
          update: { metadata: { 'some': 'data' } }
        })

        const [, [payload]] = await Promise.all([
          upsert,
          waitForPubSub(PubSubEvent.MESSAGE)
        ])

        expect(await db.message.count()).to.eq(1)

        expect(payload.action).to.eq('update')
        expect(payload.message).not.to.be.null;
        expect(payload.message.id).to.eq(message.id)
        expect(payload.message.metadata).to.deep.eq({ 'some': 'data' })
      })
    })

    describe('ReadReceipt events', () => {

      it('fires a READ_RECEIPT created event when a readReceipt is created', async () => {
        const message = await factories.messageFactory.create()

        const [receipt, [payload]] = await Promise.all([
          factories.readReceiptFactory.create({ lastReadMessageId: message.id }),
          waitForPubSub(PubSubEvent.READ_RECEIPT)
        ])

        expect(payload).to.have.keys('action', 'readReceipt');
        expect(payload.action).to.eq('create');
        expect(payload.readReceipt.id).to.eq(receipt.id);
      })

      it('fires a READ_RECEIPT created event when a readReceipt is created via an upsert', async () => {
        const message = await factories.messageFactory.create()

        const data = factories.readReceiptFactory.build({
          userId: user.id,
          userType: AuthorType.STAFF,
          conversationId: message.conversationId,
          lastReadMessageId: message.id
        });

        const upsert = db.readReceipt.upsert({
          where: {
            userId_userType_conversationId: _.pick(data, 'userId', 'userType', 'conversationId')
          },
          create: factories.readReceiptFactory.build({
            userId: user.id,
            userType: AuthorType.STAFF,
            conversationId: message.conversationId,
            lastReadMessageId: message.id
          }),
          update: {}
        })

        const [receipt, [payload]] = await Promise.all([
          upsert,
          waitForPubSub(PubSubEvent.READ_RECEIPT)
        ])

        expect(payload).to.have.keys('action', 'readReceipt');
        expect(payload.action).to.eq('create');
        expect(payload.readReceipt.id).to.eq(receipt.id);
      })

      it('fires multiple READ_RECEIPT updated events for batch updateMany operations', async () => {
        const conversation = await factories.conversationFactory.create()
        const message1 = await factories.messageFactory.create({ conversationId: conversation.id })
        const message2 = await factories.messageFactory.create({ conversationId: conversation.id })

        // Create our read receipts to update
        await factories.readReceiptFactory.create({
          conversationId: conversation.id,
          lastReadMessageId: message1.id
        }),
        await factories.readReceiptFactory.create({
          conversationId: conversation.id,
          lastReadMessageId: message1.id
        })

        const update = db.readReceipt.updateMany({
          where: {},
          data: {
            lastReadMessageId: message2.id
          }
        });

        const [result, events] = await Promise.all([update, waitForPubSub(PubSubEvent.READ_RECEIPT, 2)])

        expect(result).to.deep.equal({ count: 2 })

        events.forEach(payload => {
          expect(payload).to.have.keys('action', 'readReceipt');
          expect(payload.action).to.eq('update');
        })

        expect(await db.readReceipt.count()).to.eq(2)
      })

      it('fires multiple READ_RECEIPT deleted events for batch deleteMany operations', async () => {
        const conversation = await factories.conversationFactory.create()
        const message = await factories.messageFactory.create({ conversationId: conversation.id })

        // Create our read receipts to update
        await factories.readReceiptFactory.create({
          conversationId: conversation.id,
          lastReadMessageId: message.id
        }),
        await factories.readReceiptFactory.create({
          conversationId: conversation.id,
          lastReadMessageId: message.id
        })

        const del = db.readReceipt.deleteMany({});

        const [result, events] = await Promise.all([del, waitForPubSub(PubSubEvent.READ_RECEIPT)])

        expect(result).to.deep.equal({ count: 2 })
        expect(events).to.be.of.length(1)

        events.forEach((payload) => {
          expect(payload).to.have.keys('action', 'readReceipt');
          expect(payload.action).to.eq('delete');
        })

        expect(await db.readReceipt.count()).to.eq(0)
      })

      it('fires a READ_RECEIPT updated event when a readReceipt is updated via an upsert', async () => {
        const conversation = await factories.conversationFactory.create()
        const message1 = await factories.messageFactory.create({ conversationId: conversation.id })
        const message2 = await factories.messageFactory.create({ conversationId: conversation.id })

        // Create our read receipts to update
        const receipt = await factories.readReceiptFactory.create({
          conversationId: conversation.id,
          lastReadMessageId: message1.id
        });

        const [events] = await Promise.all([
          waitForPubSub(PubSubEvent.READ_RECEIPT),
          db.readReceipt.upsert({
            where: { id: receipt.id },
            create: receipt,
            update: { lastReadMessageId: message2.id }
          })
        ])

        const [payload] = events;
        expect(payload.action).to.eq('update')
        expect(payload.readReceipt).to.exist
        expect(payload.readReceipt.id).to.eq(receipt.id)
      })
    })

    describe('Conversation events', () => {

      it('fires a CONVERSATION event when a conversation is created', async () => {
        const [conversation, [payload]] = await Promise.all([
          factories.conversationFactory.create(),
          waitForPubSub(PubSubEvent.CONVERSATION)
        ])

        expect(payload).to.have.keys('action', 'conversation');
        expect(payload.action).to.eq('create');
        expect(payload.conversation.id).to.eq(conversation.id);
      })

      it('fires a CONVERSATION created event when a conversation is created via an upsert', async () => {
        const customer = await factories.customerFactory.create();

        const [events, conversation] = await Promise.all([
          waitForPubSub(PubSubEvent.CONVERSATION),
          db.conversation.upsert({
            where: {
              sunshineConversationId: 'foo'
            },
            create: factories.conversationFactory.build({
              sunshineConversationId: 'foo',
              customerId: customer.id
            }),
            update: {}
          })
        ])

        const [payload] = events;
        expect(payload).to.have.keys('action', 'conversation');
        expect(payload.action).to.eq('create');
        expect(payload.conversation).to.exist
        expect(payload.conversation.id).to.eq(conversation.id)
        expect(payload.conversation).to.have.property('sunshineConversationId', 'foo')
      })

      it('fires a CONVERSATION updated event when a conversation is updated', async () => {
        const conversation = await factories.conversationFactory.create();

        const [[payload]] = await Promise.all([
          waitForPubSub(PubSubEvent.CONVERSATION),
          db.conversation.update({
            where: {
              id: conversation.id
            },
            data: {
              metadata: { some: 'update' }
            }
          })
        ])

        expect(payload).to.have.keys('action', 'conversation');
        expect(payload.action).to.eq('update');
        expect(payload.conversation).to.exist
        expect(payload.conversation.id).to.eq(conversation.id)
        expect(payload.conversation.metadata).to.deep.equal({ some: 'update' })
      })

      it('fires a CONVERSATION updated event when a conversation is updated via an upsert', async () => {
        const conversation = await factories.conversationFactory.create();

        const [[payload]] = await Promise.all([
          waitForPubSub(PubSubEvent.CONVERSATION),
          db.conversation.upsert({
            where: {
              id: conversation.id
            },
            create: factories.conversationFactory.build(),
            update: {
              metadata: { some: 'update' }
            }
          })
        ])

        expect(payload).to.have.keys('action', 'conversation');
        expect(payload.action).to.eq('update');
        expect(payload.conversation).to.exist
        expect(payload.conversation.id).to.eq(conversation.id)
        expect(payload.conversation.metadata).to.deep.equal({ some: 'update' })
      })
    })
  })
});
