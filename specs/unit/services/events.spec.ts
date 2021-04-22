import { pubsub, connect, PubSubEvent }       from '../../../lib/services/events/pubsub'
import * as factories                         from '../../factories'
import { expect }                             from 'chai'
import _                                      from 'lodash'
import db                                     from '../../../lib/db'
import { waitFor }                            from '../../../lib/utils/async'

describe('Services/events', () => {
  describe('PubSub', () => {
    let events : any[] = [];
    let subId  : any   = null;

    before(() => connect());

    beforeEach(async () => {
      events = [];
      subId = await pubsub.subscribe(PubSubEvent.MESSAGE, (body) => events.push([
        PubSubEvent.MESSAGE, body
      ]));
    })

    afterEach(async () => {
      await pubsub.unsubscribe(subId)
    })

    it('Fires a message created event when a message is created', async () => {
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

    it('Fires a message created event when a message is created via an upsert', async () => {
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

    it('Fires a message updated event when a message is updated via an upsert', async () => {
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
});
