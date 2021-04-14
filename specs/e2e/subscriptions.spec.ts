import { before }                                from "mocha"
import { gql }                                   from "apollo-server-core"
import * as factories                            from '../factories'
import { GoodChatPermissions }                   from "../../lib/typings/goodchat"
import * as e2e                                  from "../spec_helpers/e2e"
import { expect }                                from "chai"
import { Conversation, ConversationType, Staff } from ".prisma/client"
import _                                         from "lodash"
import db                                        from "../../lib/db"

const USER_EXTERNAL_ID = '747';

describe('E2E/Subscriptions', () => {
  let serverInfo : e2e.TestServerInfo
  let gqlClient : e2e.TestApolloClient
  let customerConversation : Conversation
  let privateConversation : Conversation
  let myPivateConversation : Conversation
  let publicConversation : Conversation

  // ---- Setup E2E Server

  before(async () => {
    serverInfo = await e2e.bootTestServer();
  })

  after(async () => {
    await e2e.teardownTestServer();
  })
  

  // ---- Seed database

  beforeEach(async () => {
    gqlClient  = e2e.buildGraphQLClient(serverInfo)

    //
    // We create the staff ahead of time just to create a private chat for it
    // Permissions will still be defined by the authentication server
    //
    const staff = await factories.staffFactory.create({ externalId: USER_EXTERNAL_ID })

    customerConversation = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER })
    publicConversation = await factories.conversationFactory.create({ type: ConversationType.PUBLIC })
    privateConversation = await factories.conversationFactory.create({ type: ConversationType.PRIVATE })
    myPivateConversation = await factories.conversationFactory.create({ type: ConversationType.PRIVATE }, {
      transient: { members: [staff] }
    })
  })

  afterEach(() => gqlClient.stop())

  describe('Receiving messages', () => {

    context('As an admin user', () => {

      before(async () => {  
        e2e.mockAuthServerResponse({
          userId: USER_EXTERNAL_ID,
          permissions: [GoodChatPermissions.ADMIN],
          displayName: 'Jane Doe'
        })
      })

      after(() => e2e.cleanAllApiMocks())

      _.each({
        "customer chats": () => customerConversation,
        "public chats": () => publicConversation,
        "my private chats": () => myPivateConversation
      }, (getConv, type) => {

        it(`I receive new messages from ${type}`, async () => {
          const sub = e2e.createSubscription({  
            client: gqlClient,
            query: gql`
              subscription newMessages {
                messageEvent {
                  action
                  message {
                    id
                    content
                    conversationId
                  }
                }
              }
            `
          });
    
          const message = await factories.messageFactory.create({ conversationId: getConv().id });
    
          await sub.waitForResults();
    
          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.messageEvent).not.to.be.null;
          
          const ev = sub.results[0].data.messageEvent;
    
          expect(ev.action).to.eq('CREATE');
          expect(ev.message.id).to.eq(message.id);
          expect(ev.message.conversationId).to.eq(getConv().id);
          expect(ev.message.content).to.deep.eq(message.content);
    
          sub.disconnect();
        })
      });

      it('I don\'t receive new messages from other private conversations', async () => {
        const sub = e2e.createSubscription({  
          client: gqlClient,
          query: gql`
            subscription newMessages {
              messageEvent {
                action
                message {
                  id
                  content
                  conversationId
                }
              }
            }
          `
        });

        const message = await factories.messageFactory.create({ conversationId: privateConversation.id });

        await sub.wait();

        expect(sub.results).to.be.of.length(0);

        sub.disconnect();
      })
    });

    context('As a user with customer chat permissions', () => {

      before(async () => {  
        e2e.mockAuthServerResponse({
          userId: USER_EXTERNAL_ID,
          permissions: [GoodChatPermissions.CHAT_CUSTOMER],
          displayName: 'Jane Doe'
        })
      })

      after(() => e2e.cleanAllApiMocks())

      _.each({
        "customer chats": () => customerConversation,
        "public chats": () => publicConversation,
        "my private chats": () => myPivateConversation
      }, (getConv, type) => {

        it(`I receive new messages from ${type}`, async () => {
          const sub = e2e.createSubscription({  
            client: gqlClient,
            query: gql`
              subscription newMessages {
                messageEvent {
                  action
                  message {
                    id
                    content
                    conversationId
                  }
                }
              }
            `
          });
    
          const message = await factories.messageFactory.create({ conversationId: getConv().id });
    
          await sub.waitForResults();
    
          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.messageEvent).not.to.be.null;
          
          const ev = sub.results[0].data.messageEvent;
    
          expect(ev.action).to.eq('CREATE');
          expect(ev.message.id).to.eq(message.id);
          expect(ev.message.conversationId).to.eq(getConv().id);
          expect(ev.message.content).to.deep.eq(message.content);
    
          sub.disconnect();
        })
      });

      it('I don\'t receive new messages from other private conversations', async () => {
        const sub = e2e.createSubscription({  
          client: gqlClient,
          query: gql`
            subscription newMessages {
              messageEvent {
                action
                message {
                  id
                  content
                  conversationId
                }
              }
            }
          `
        });

        const message = await factories.messageFactory.create({ conversationId: privateConversation.id });

        await sub.wait();

        expect(sub.results).to.be.of.length(0);

        sub.disconnect();
      })
    });

    context('As a user with no permissions', () => {

      before(async () => {  
        e2e.mockAuthServerResponse({
          userId: USER_EXTERNAL_ID,
          permissions: [],
          displayName: 'Jane Doe'
        })
      })

      after(() => e2e.cleanAllApiMocks())

      _.each({
        "public chats": () => publicConversation,
        "my private chats": () => myPivateConversation
      }, (getConv, type) => {

        it(`I receive new messages from ${type}`, async () => {
          const sub = e2e.createSubscription({  
            client: gqlClient,
            query: gql`
              subscription newMessages {
                messageEvent {
                  action
                  message {
                    id
                    content
                    conversationId
                  }
                }
              }
            `
          });
    
          const message = await factories.messageFactory.create({ conversationId: getConv().id });
    
          await sub.waitForResults();
    
          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.messageEvent).not.to.be.null;
          
          const ev = sub.results[0].data.messageEvent;
    
          expect(ev.action).to.eq('CREATE');
          expect(ev.message.id).to.eq(message.id);
          expect(ev.message.conversationId).to.eq(getConv().id);
          expect(ev.message.content).to.deep.eq(message.content);
    
          sub.disconnect();
        })
      });

      it('I don\'t receive new messages from customer conversations', async () => {
        const sub = e2e.createSubscription({  
          client: gqlClient,
          query: gql`
            subscription newMessages {
              messageEvent {
                action
                message {
                  id
                  content
                  conversationId
                }
              }
            }
          `
        });

        await factories.messageFactory.create({ conversationId: customerConversation.id });

        await sub.wait();

        expect(sub.results).to.be.of.length(0);

        sub.disconnect();
      })

      it('I don\'t receive new messages from other private conversations', async () => {
        const sub = e2e.createSubscription({  
          client: gqlClient,
          query: gql`
            subscription newMessages {
              messageEvent {
                action
                message {
                  id
                  content
                  conversationId
                }
              }
            }
          `
        });

        const message = await factories.messageFactory.create({ conversationId: privateConversation.id });

        await sub.wait();

        expect(sub.results).to.be.of.length(0);

        sub.disconnect();
      })
    });

    describe('Filtering', () => {

      before(async () => {  
        e2e.mockAuthServerResponse({
          userId: USER_EXTERNAL_ID,
          permissions: [GoodChatPermissions.ADMIN],
          displayName: 'Jane Doe'
        })
      })

      after(() => e2e.cleanAllApiMocks());

      it('filters on the specified action', async () => {
        const sub = e2e.createSubscription({  
          client: gqlClient,
          query: gql`
            subscription newMessages {
              messageEvent(actions: [UPDATE, DELETE]) {
                action
                message {
                  id
                  content
                  conversationId
                }
              }
            }
          `
        });
  
        const message = await factories.messageFactory.create({ conversationId: publicConversation.id });
  
        await sub.wait();
  
        expect(sub.error).to.be.null
        expect(sub.results, "No event for creation").to.be.of.length(0);

        await db.message.update({
          where: { id: message.id },
          data: {
            metadata: { 'some': 'data' }
          }
        })

        await sub.waitForResults({ len: 1 });

        expect(sub.error).to.be.null
        expect(sub.results, "Event received after update").to.be.of.length(1);
        expect(sub.results[0].data.messageEvent.action, "Update event received with correct action").eq('UPDATE')

        await db.message.delete({ where: { id: message.id } })

        await sub.waitForResults({ len: 2 });

        expect(sub.error).to.be.null
        expect(sub.results, "Event received after update").to.be.of.length(2);
        expect(sub.results[1].data.messageEvent.action, "Delete event received with correct action").eq('DELETE')
      })

      it('filters on the specified conversation', async () => {
        const sub = e2e.createSubscription({  
          client: gqlClient,
          variables: { cid: publicConversation.id },
          query: gql`
            subscription newMessages($cid: Int) {
              messageEvent(conversationId: $cid) {
                action
                message {
                  id
                  content
                  conversationId
                }
              }
            }
          `
        });
  
        await factories.messageFactory.create({ conversationId: myPivateConversation.id });
  
        await sub.wait();
  
        expect(sub.error).to.be.null
        expect(sub.results, "No event for other conversation").to.be.of.length(0);

        await factories.messageFactory.create({ conversationId: publicConversation.id });

        await sub.waitForResults();

        expect(sub.error).to.be.null
        expect(sub.results, "Event received for conversation subscribed to").to.be.of.length(1);
      })
    })
  });
})
