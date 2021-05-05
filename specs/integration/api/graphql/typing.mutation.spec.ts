import { Conversation, ConversationType, Customer, Staff }  from '@prisma/client';
import { clearCurrentUser, setCurrentUser }                 from '../../../spec_helpers/fake_auth'
import { ApolloServerTestClient }                           from 'apollo-server-testing'
import { createGoodchatServer }                             from '../../../spec_helpers/agent'
import { GoodChatPermissions }                              from '../../../../lib/typings/goodchat'
import { ActivitiesApi }                                    from 'sunshine-conversations-client'
import * as factories                                       from '../../../factories'
import { expect }                                           from 'chai'
import { gql }                                              from 'apollo-server-koa';
import config                                               from '../../../../lib/config'
import sinon                                                from 'sinon';
import _                                                    from 'lodash';


describe('GraphQL Start/Stop Typing mutations', () => {
  let gqlAgent              : ApolloServerTestClient
  let user                  : Staff
  let customer              : Customer
  let sunshineActivityStub  : sinon.SinonStub

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  beforeEach(async () => {
    sunshineActivityStub = sinon.stub(ActivitiesApi.prototype, 'postActivity');
    user = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })
    customer = await factories.customerFactory.create();

    setCurrentUser(user);
  });

  afterEach(() => {
    clearCurrentUser()
    sunshineActivityStub.restore();
  })

  describe('Typing on/off', () => {
    context('for a customer chat', () => {
      let conversation : Conversation

      beforeEach(async () => {
        conversation = await factories.conversationFactory.create({
          customerId: customer.id,
          type: ConversationType.CUSTOMER
        })
      })

      it('sends the start typing event to sunshine', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation StartTyping {
              startTyping(conversationId: ${conversation.id}) {
                id
                customerId
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(sunshineActivityStub.callCount).to.eq(1)
        expect(sunshineActivityStub.getCall(0).args).to.deep.eq([
          config.smoochAppId,
          conversation.sunshineConversationId,
          {
            author: {
              type: "business"
            },
            type: "typing:start"
          }
        ]);
      })

      it('sends the stop typing event to sunshine', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation StopTyping {
              stopTyping(conversationId: ${conversation.id}) {
                id
                customerId
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(sunshineActivityStub.callCount).to.eq(1)
        expect(sunshineActivityStub.getCall(0).args).to.deep.eq([
          config.smoochAppId,
          conversation.sunshineConversationId,
          {
            author: {
              type: "business"
            },
            type: "typing:stop"
          }
        ]);
      })
    })

    context('for a non-customer chat', () => {
      let conversation : Conversation

      beforeEach(async () => {
        conversation = await factories.conversationFactory.create({
          type: ConversationType.PUBLIC
        })
      })

      it('doesnt send any event to sunshine when the user starts typing', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation StartTyping {
              startTyping(conversationId: ${conversation.id}) {
                id
                customerId
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(sunshineActivityStub.callCount).to.eq(0)
      })

      it('doesnt send any event to sunshine when the user stops typing', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation StopTyping {
              stopTyping(conversationId: ${conversation.id}) {
                id
                customerId
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(sunshineActivityStub.callCount).to.eq(0)
      })
    })

    context('for a chat I\'m not entitled to', () => {
      let conversation : Conversation

      beforeEach(async () => {
        conversation = await factories.conversationFactory.create({
          type: ConversationType.PRIVATE
        })
      })

      it('returns a 403 when I try to start typing', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation StartTyping {
              startTyping(conversationId: ${conversation.id}) {
                id
                customerId
              }
            }
          `
        })
        expect(errors).to.have.lengthOf(1);
        expect(errors[0].message).to.eq('Forbidden');
        expect(errors[0].extensions.code).to.eq('FORBIDDEN');
        expect(errors[0].extensions.exception).to.deep.eq({
          error: 'Forbidden',
          status: 403,
          type: 'ForbiddenError'
        })
      })

      it('returns a 403 when I try to stop typing', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation StopTyping {
              stopTyping(conversationId: ${conversation.id}) {
                id
                customerId
              }
            }
          `
        })
        expect(errors).to.have.lengthOf(1);
        expect(errors[0].message).to.eq('Forbidden');
        expect(errors[0].extensions.code).to.eq('FORBIDDEN');
        expect(errors[0].extensions.exception).to.deep.eq({
          error: 'Forbidden',
          status: 403,
          type: 'ForbiddenError'
        })
      })
    })
  });
});
