import { pubsub, PubSubEvent }   from '../../../lib/services/events/pubsub'
import * as factories            from '../../factories'
import { waitFor }               from '../../../lib/utils/async'
import { expect }                from 'chai'
import { AuthorType, Staff }     from '.prisma/client'
import db                        from '../../../lib/db'
import _                         from 'lodash'

describe('Services/events', () => {
  describe('PubSub', () => {
    let user    : Staff
    let events  : any[] = [];
    let subIds  : any[] = null;

    beforeEach(async () => {
      user = await factories.staffFactory.create();
      events = [];
      subIds = await Promise.all(
        _.values(PubSubEvent).map(ev => (
          pubsub.subscribe(ev, (body) => events.push([ev, body]))
        ))
      )
    })

    afterEach(async () => {
      await Promise.all(subIds.map(id => pubsub.unsubscribe(id)))
    })

    describe('Message events', () => {

      it('fires a MESSAGE created event when a message is created', async () => {
        expect(events).to.be.of.length(0)

        const message = await factories.messageFactory.create({})

        await waitFor(100);

        expect(events).to.be.of.length(1)

        const [ev, payload] = events[0];

        expect(ev).to.eq(PubSubEvent.MESSAGE)
        expect(payload).to.have.keys('action', 'message');
        expect(payload.action).to.eq('create');
        expect(payload.message.id).to.eq(message.id);
        expect(payload.message.content).to.deep.equal(message.content);
      })

      it('fires a MESSAGE created event when a message is created via an upsert', async () => {
        expect(events).to.be.of.length(0)

        const conversation = await factories.conversationFactory.create({});
        const message = factories.messageFactory.build({ conversationId: conversation.id });

        await db.message.upsert({
          where: { id: message.id },
          create: message,
          update: {}
        })

        await waitFor(100);

        expect(events).to.be.of.length(1)

        const [ev, payload] = events[0];

        expect(ev).to.eq(PubSubEvent.MESSAGE)
        expect(payload).to.have.keys('action', 'message');
        expect(payload.action).to.eq('create');
        expect(payload.message.id).to.eq(message.id);
        expect(payload.message.content).to.deep.equal(message.content);
      })

      it('fires multiple MESSAGE updated events for batch updateMany operations', async () => {
        expect(events).to.be.of.length(0)

        const messages = await factories.messageFactory.createList(3);

        await waitFor(100);

        expect(events).to.be.of.length(3)

        expect(
          await db.message.updateMany({
            where: {},
            data: {
              metadata: { 'some': 'data' }
            }
          })
        ).to.deep.equal({ count: 3 })

        await waitFor(100);

        expect(events).to.be.of.length(6)

        events.slice(-3).forEach(([ev, payload]) => {
          expect(ev).to.eq(PubSubEvent.MESSAGE)
          expect(payload).to.have.keys('action', 'message');
          expect(payload.action).to.eq('update');
        })
      })

      it('fires multiple MESSAGE deleted events for batch deleteMany operations', async () => {
        expect(events).to.be.of.length(0)

        const messages = await factories.messageFactory.createList(3);

        await waitFor(100);

        expect(events).to.be.of.length(3)

        expect(
          await db.message.deleteMany({ where: {} })
        ).to.deep.equal({ count: 3 })

        await waitFor(100);

        expect(events).to.be.of.length(6)

        events.slice(-3).forEach(([ev, payload]) => {
          expect(ev).to.eq(PubSubEvent.MESSAGE)
          expect(payload).to.have.keys('action', 'message');
          expect(payload.action).to.eq('delete');
        })
      })

      it('fires a MESSAGE updated event when a message is updated via an upsert', async () => {
        expect(events).to.be.of.length(0)

        const conversation = await factories.conversationFactory.create({});
        const message = await factories.messageFactory.create({ conversationId: conversation.id });

        await waitFor(100);

        expect(events).to.be.of.length(1)
        expect(await db.message.count()).to.eq(1)

        await db.message.upsert({
          where: { id: message.id },
          create: _.omit(message, 'id'),
          update: { metadata: { 'some': 'data' } }
        })

        await waitFor(100);

        expect(await db.message.count()).to.eq(1)
        expect(events).to.be.of.length(2)

        const [, payload] = events[1];

        expect(payload.action).to.eq('update')
        expect(payload.message).not.to.be.null;
        expect(payload.message.id).to.eq(message.id)
        expect(payload.message.metadata).to.deep.eq({ 'some': 'data' })
      })
    })

    describe('ReadReceipt events', () => {

      it('fires a READ_RECEIPT created event when a readReceipt is created', async () => {
        expect(events).to.be.of.length(0)

        const message = await factories.messageFactory.create()
        const receipt = await factories.readReceiptFactory.create({ lastReadMessageId: message.id })

        await waitFor(100);

        expect(events).to.be.of.length(2)

        const [ev, payload] = events[1];

        expect(ev).to.eq(PubSubEvent.READ_RECEIPT)
        expect(payload).to.have.keys('action', 'readReceipt');
        expect(payload.action).to.eq('create');
        expect(payload.readReceipt.id).to.eq(receipt.id);
      })

      it('fires a READ_RECEIPT created event when a readReceipt is created via an upsert', async () => {
        expect(events).to.be.of.length(0)

        const message = await factories.messageFactory.create()

        const data = factories.readReceiptFactory.build({
          userId: user.id,
          userType: AuthorType.STAFF,
          conversationId: message.conversationId,
          lastReadMessageId: message.id
        });

        const receipt = await db.readReceipt.upsert({
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

        await waitFor(100);

        expect(events).to.be.of.length(2)

        expect(events[0][0]).to.eq(PubSubEvent.MESSAGE);

        const [ev, payload] = events[1];

        expect(ev).to.eq(PubSubEvent.READ_RECEIPT)
        expect(payload).to.have.keys('action', 'readReceipt');
        expect(payload.action).to.eq('create');
        expect(payload.readReceipt.id).to.eq(receipt.id);
      })

      it('fires multiple READ_RECEIPT updated events for batch updateMany operations', async () => {
        expect(events).to.be.of.length(0)

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

        await waitFor(100);

        expect(events).to.be.of.length(4)
        expect(events.map(_.first)).to.deep.eq([
          PubSubEvent.MESSAGE,
          PubSubEvent.MESSAGE,
          PubSubEvent.READ_RECEIPT,
          PubSubEvent.READ_RECEIPT,
        ])

        expect(
          await db.readReceipt.updateMany({
            where: {},
            data: {
              lastReadMessageId: message2.id
            }
          })
        ).to.deep.equal({ count: 2 })

        await waitFor(100);

        expect(events).to.be.of.length(6)

        events.slice(-2).forEach(([ev, payload]) => {
          expect(ev).to.eq(PubSubEvent.READ_RECEIPT)
          expect(payload).to.have.keys('action', 'readReceipt');
          expect(payload.action).to.eq('update');
        })

        expect(await db.readReceipt.count()).to.eq(2)
      })

      it('fires multiple READ_RECEIPT deleted events for batch deleteMany operations', async () => {
        expect(events).to.be.of.length(0)

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

        await waitFor(100);

        expect(events).to.be.of.length(3)
        expect(events.map(_.first)).to.deep.eq([
          PubSubEvent.MESSAGE,
          PubSubEvent.READ_RECEIPT,
          PubSubEvent.READ_RECEIPT,
        ])

        expect(
          await db.readReceipt.deleteMany({})
        ).to.deep.equal({ count: 2 })

        await waitFor(100);

        expect(events).to.be.of.length(5)

        events.slice(-2).forEach(([ev, payload]) => {
          expect(ev).to.eq(PubSubEvent.READ_RECEIPT)
          expect(payload).to.have.keys('action', 'readReceipt');
          expect(payload.action).to.eq('delete');
        })

        expect(await db.readReceipt.count()).to.eq(0)
      })

      it('fires a READ_RECEIPT updated event when a readReceipt is updated via an upsert', async () => {
        expect(events).to.be.of.length(0)

        const conversation = await factories.conversationFactory.create()
        const message1 = await factories.messageFactory.create({ conversationId: conversation.id })
        const message2 = await factories.messageFactory.create({ conversationId: conversation.id })

        // Create our read receipts to update
        const receipt = await factories.readReceiptFactory.create({
          conversationId: conversation.id,
          lastReadMessageId: message1.id
        });

        await waitFor(100);

        expect(events).to.be.of.length(3)
        expect(events.map(_.first)).to.deep.eq([
          PubSubEvent.MESSAGE,
          PubSubEvent.MESSAGE,
          PubSubEvent.READ_RECEIPT
        ])

        await db.readReceipt.upsert({
          where: { id: receipt.id },
          create: receipt,
          update: { lastReadMessageId: message2.id }
        })

        await waitFor(100);

        expect(events).to.be.of.length(4)

        const [, payload] = _.last(events);

        expect(payload.action).to.eq('update')
        expect(payload.readReceipt).to.exist
        expect(payload.readReceipt.id).to.eq(receipt.id)
      })
    })
  })
});
