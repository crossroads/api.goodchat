import { MessagesApi } from "sunshine-conversations-client"
import * as factories  from "../../factories"
import sinon           from "sinon"
import messageJob      from "../../../lib/jobs/message.job"
import { expect }      from "chai"
import db              from "../../../lib/db"
import _               from "lodash"
import {
  Message,
  Conversation,
  ConversationType,
  DeliveryStatus
} from ".prisma/client"

describe('Message Jobs', () => {

  describe('#deliver', () => {
    let postMessageStub  : sinon.SinonStub
    let message       : Message
    let conversation  : Conversation

    context('successful sunshine post', () => {

      beforeEach(() => {
        postMessageStub = sinon.stub(MessagesApi.prototype, 'postMessage').returns(Promise.resolve({
          messages: [factories.sunshineMessageFactory.build()]
        }))
      })

      afterEach(() => postMessageStub.restore())

      context('for a customer conversation', () => {
        beforeEach(async () => {
          conversation = await factories.conversationFactory.create({
            type: ConversationType.CUSTOMER
          })
        })

        _.each([
          DeliveryStatus.UNSENT,
          DeliveryStatus.FAILED
        ], (status) => {
          context(`for a message with ${status} delivery status`, () => {
            beforeEach(async () => {
              message = await factories.messageFactory.create({
                conversationId: conversation.id,
                customerDeliveryStatus: status,
                sunshineMessageId: null
              })
            })

            it('pushes the message to SunshineConversation', async () => {
              const completionCb = sinon.stub();
              const failureCb = sinon.stub();

              await new Promise(done => {
                messageJob.queue.add("deliver", message);
                messageJob.worker.on('completed', () => { completionCb(); done(true) })
                messageJob.worker.on('failed', () => { failureCb(); done(false) })
              })

              expect(completionCb.callCount).to.eq(1)
              expect(failureCb.callCount).to.eq(0)
              expect(postMessageStub.callCount).to.eq(1)
            })

            it('updates the delivery status to SENT', async () => {
              const completionCb = sinon.stub();
              const failureCb = sinon.stub();

              await new Promise(done => {
                messageJob.queue.add("deliver", message);
                messageJob.worker.on('completed', () => { completionCb(); done(true) })
                messageJob.worker.on('failed', () => { failureCb(); done(false) })
              })

              expect(completionCb.callCount).to.eq(1)
              expect(failureCb.callCount).to.eq(0)

              const updatedMessage = await db.message.findUnique({ where: { id: message.id }});
              expect(updatedMessage.customerDeliveryStatus).to.eq(DeliveryStatus.SENT)
            })
          })
        });

        _.each([
          DeliveryStatus.DELIVERED,
          DeliveryStatus.SENT
        ], (status) => {
          context(`for a message with ${status} delivery status`, () => {
            beforeEach(async () => {
              message = await factories.messageFactory.create({
                conversationId: conversation.id,
                customerDeliveryStatus: status,
                sunshineMessageId: null
              })
            })

            it('does not push the message to SunshineConversation', async () => {
              const completionCb = sinon.stub();
              const failureCb = sinon.stub();

              await new Promise(done => {
                messageJob.queue.add("deliver", message);
                messageJob.worker.on('completed', () => { completionCb(); done(true) })
                messageJob.worker.on('failed', () => { failureCb(); done(false) })
              })

              expect(completionCb.callCount).to.eq(1)
              expect(failureCb.callCount).to.eq(0)
              expect(postMessageStub.callCount).to.eq(0)
            })

            it('doesnt modify the delivery status', async () => {
              const completionCb = sinon.stub();
              const failureCb = sinon.stub();

              await new Promise(done => {
                messageJob.queue.add("deliver", message);
                messageJob.worker.on('completed', () => { completionCb(); done(true) })
                messageJob.worker.on('failed', () => { failureCb(); done(false) })
              })

              expect(completionCb.callCount).to.eq(1)
              expect(failureCb.callCount).to.eq(0)

              const updatedMessage = await db.message.findUnique({ where: { id: message.id }});
              expect(updatedMessage.customerDeliveryStatus).to.eq(status)
            })
          })
        });
      })
    })

    context('failure to post to sunshine', () => {

      beforeEach(() => {
        postMessageStub = sinon.stub(MessagesApi.prototype, 'postMessage').throws(
          new Error('whoops')
        )
      })

      afterEach(() => postMessageStub.restore())

      context('for a customer conversation', () => {
        beforeEach(async () => {
          conversation = await factories.conversationFactory.create({
            type: ConversationType.CUSTOMER
          })

          message = await factories.messageFactory.create({
            conversationId: conversation.id,
            customerDeliveryStatus: DeliveryStatus.UNSENT,
            sunshineMessageId: null
          })
        })

        it('marks the delivery status as FAILED', async () => {
          const completionCb = sinon.stub();
          const failureCb = sinon.stub();

          await new Promise(done => {
            messageJob.queue.add("deliver", message);
            messageJob.worker.on('completed', () => { completionCb(); done(true) })
            messageJob.worker.on('failed', () => { failureCb(); done(false) })
          })

          expect(completionCb.callCount).to.eq(0)
          expect(failureCb.callCount).to.eq(1)
          expect(postMessageStub.callCount).to.eq(1)

          const updatedMessage = await db.message.findUnique({
            where: {
              id: message.id
            }
          })

          expect(updatedMessage.customerDeliveryStatus).to.eq(DeliveryStatus.FAILED);
          expect(updatedMessage.customerDeliveryError).to.eq('whoops');
        })
      })
    })
  })
})
