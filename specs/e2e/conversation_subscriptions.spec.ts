import { before }                                from "mocha"
import { gql }                                   from "apollo-server-core"
import * as factories                            from '../factories'
import { GoodChatPermissions }                   from "../../lib/typings/goodchat"
import * as e2e                                  from "../spec_helpers/e2e"
import { expect }                                from "chai"
import { ConversationType, Staff }               from ".prisma/client"
import _                                         from "lodash"
import db                                        from "../../lib/db"

const USER_EXTERNAL_ID = '747';

describe('E2E/Subscriptions/Conversations', () => {
  let serverInfo : e2e.TestServerInfo
  let gqlClient : e2e.TestApolloClient
  let staff : Staff

  const makeCustomerConversation = () => factories.conversationFactory.create({ type: ConversationType.CUSTOMER })
  const makePublicConversation = () => factories.conversationFactory.create({ type: ConversationType.PUBLIC })
  const makePrivateConversation = () => factories.conversationFactory.create({ type: ConversationType.PRIVATE })
  const makeMyPivateConversation = () => {
    return factories.conversationFactory.create({ type: ConversationType.PRIVATE }, {
      transient: { members: [staff] }
    })
  }

  // ---- Setup E2E Server

  before(async () => {
    serverInfo = await e2e.bootTestServer();
  })

  after(async () => {
    await e2e.teardownTestServer();
  })

  // ---- Seed database

  beforeEach(async () => {
    gqlClient = e2e.buildGraphQLClient(serverInfo)

    //
    // We create the staff ahead of time just to create a private chat for it
    // Permissions will still be defined by the authentication server
    //
    staff = await factories.staffFactory.create({ externalId: USER_EXTERNAL_ID })
  })

  afterEach(() => gqlClient.stop())

  describe('Receiving conversation events', () => {

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
        "customer chats": makeCustomerConversation,
        "public chats": makePublicConversation,
        "my private chats": makeMyPivateConversation
      }, (makeConversation, type) => {

        it(`I receive conversation create events from ${type}`, async () => {
          const sub = e2e.createSubscription({
            client: gqlClient,
            query: gql`
              subscription listenToConversations {
                conversationEvent {
                  action
                  conversation {
                    id
                    metadata
                  }
                }
              }
            `
          });

          const conversation = await makeConversation();

          await sub.waitForResults();

          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.conversationEvent).not.to.be.null;

          const ev = sub.results[0].data.conversationEvent;

          expect(ev.action).to.eq('CREATE');
          expect(ev.conversation.id).to.eq(conversation.id);

          sub.disconnect();
        })

        it(`I receive conversation update events from ${type}`, async () => {
          const conversation = await makeConversation();

          const sub = e2e.createSubscription({
            client: gqlClient,
            query: gql`
              subscription listenToConversations {
                conversationEvent {
                  action
                  conversation {
                    id
                    metadata
                  }
                }
              }
            `
          });


          await db.conversation.update({
            where: { id: conversation.id },
            data: {
              metadata: { some: 'update' }
            }
          })

          await sub.waitForResults();

          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.conversationEvent).not.to.be.null;

          const ev = sub.results[0].data.conversationEvent;

          expect(ev.action).to.eq('UPDATE');
          expect(ev.conversation.id).to.eq(conversation.id);
          expect(ev.conversation.metadata).to.deep.eq({ some: 'update' });

          sub.disconnect();
        })
      });

      it('I don\'t receive events from other private conversations', async () => {
        const privateConversation = await makePrivateConversation();

        const sub = e2e.createSubscription({
          client: gqlClient,
          query: gql`
            subscription listenToConversations {
              conversationEvent {
                action
                conversation {
                  id
                  metadata
                }
              }
            }
          `
        });

        await db.conversation.update({
          where: { id: privateConversation.id },
          data: {
            metadata: { some: 'update' }
          }
        })

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
        "customer chats": makeCustomerConversation,
        "public chats": makePublicConversation,
        "my private chats": makeMyPivateConversation
      }, (makeConv, type) => {

        it(`I receive conversation update events from ${type}`, async () => {
          const sub = e2e.createSubscription({
            client: gqlClient,
            query: gql`
              subscription listenToConversations {
                conversationEvent {
                  action
                  conversation {
                    id
                    metadata
                  }
                }
              }
            `
          });

          const conversation = await makeConv();

          await sub.waitForResults();

          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.conversationEvent).not.to.be.null;

          const ev = sub.results[0].data.conversationEvent;

          expect(ev.action).to.eq('CREATE');
          expect(ev.conversation.id).to.eq(conversation.id);

          sub.disconnect();
        })

        it(`I receive conversation update events from ${type}`, async () => {
          const conversation = await makeConv();

          const sub = e2e.createSubscription({
            client: gqlClient,
            query: gql`
              subscription listenToConversations {
                conversationEvent {
                  action
                  conversation {
                    id
                    metadata
                  }
                }
              }
            `
          });

          await db.conversation.update({
            where: { id: conversation.id },
            data: {
              metadata: { some: 'update' }
            }
          })

          await sub.waitForResults();

          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.conversationEvent).not.to.be.null;

          const ev = sub.results[0].data.conversationEvent;

          expect(ev.action).to.eq('UPDATE');
          expect(ev.conversation.id).to.eq(conversation.id);
          expect(ev.conversation.metadata).to.deep.eq({ some: 'update' });

          sub.disconnect();
        })
      });

      it('I don\'t receive events from other private conversations', async () => {
        const privateConversation = await makePrivateConversation();

        const sub = e2e.createSubscription({
          client: gqlClient,
          query: gql`
            subscription listenToConversations {
              conversationEvent {
                action
                conversation {
                  id
                  metadata
                }
              }
            }
          `
        });

        await db.conversation.update({
          where: { id: privateConversation.id },
          data: {
            metadata: { some: 'update' }
          }
        })

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
        "public chats": makePublicConversation,
        "my private chats": makeMyPivateConversation
      }, (makeConv, type) => {

        it(`I receive conversation create events from ${type}`, async () => {
          const sub = e2e.createSubscription({
            client: gqlClient,
            query: gql`
              subscription listenToConversations {
                conversationEvent {
                  action
                  conversation {
                    id
                    metadata
                  }
                }
              }
            `
          });

          const conversation = await makeConv();

          await sub.waitForResults();

          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.conversationEvent).not.to.be.null;

          const ev = sub.results[0].data.conversationEvent;

          expect(ev.action).to.eq('CREATE');
          expect(ev.conversation.id).to.eq(conversation.id);

          sub.disconnect();
        })

        it(`I receive conversation update events from ${type}`, async () => {
          const conversation = await makeConv();

          const sub = e2e.createSubscription({
            client: gqlClient,
            query: gql`
              subscription listenToConversations {
                conversationEvent {
                  action
                  conversation {
                    id
                    metadata
                  }
                }
              }
            `
          });

          await db.conversation.update({
            where: { id: conversation.id },
            data: {
              metadata: { some: 'update' }
            }
          })

          await sub.waitForResults();

          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.conversationEvent).not.to.be.null;

          const ev = sub.results[0].data.conversationEvent;

          expect(ev.action).to.eq('UPDATE');
          expect(ev.conversation.id).to.eq(conversation.id);
          expect(ev.conversation.metadata).to.deep.eq({ some: 'update' });

          sub.disconnect();
        })
      });

      it('I don\'t receive events from customer conversations', async () => {
        const conversation = await makeCustomerConversation();

        const sub = e2e.createSubscription({
          client: gqlClient,
          query: gql`
            subscription listenToConversations {
              conversationEvent {
                action
                conversation {
                  id
                  metadata
                }
              }
            }
          `
        });

        await db.conversation.update({
          where: { id: conversation.id },
          data: {
            metadata: { some: 'update' }
          }
        })

        await sub.wait();

        expect(sub.results).to.be.of.length(0);

        sub.disconnect();
      })

      it('I don\'t receive events from other private conversations', async () => {
        const privateConversation = await makePrivateConversation();

        const sub = e2e.createSubscription({
          client: gqlClient,
          query: gql`
            subscription listenToConversations {
              conversationEvent {
                action
                conversation {
                  id
                  metadata
                }
              }
            }
          `
        });

        await db.conversation.update({
          where: { id: privateConversation.id },
          data: {
            metadata: { some: 'update' }
          }
        })

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

      it('filters on the specified conversation', async () => {
        const conversation = await makePublicConversation();
        const otherConversation = await makePublicConversation();

        const sub = e2e.createSubscription({
          client: gqlClient,
          variables: { cid: conversation.id },
          query: gql`
            subscription listenToConversation($cid: Int) {
              conversationEvent(conversationId: $cid) {
                action
                conversation {
                  id
                  metadata
                }
              }
            }
          `
        });

        await factories.messageFactory.create({ conversationId: otherConversation.id });

        await sub.wait();

        expect(sub.error).to.be.null
        expect(sub.results, "No event for other conversation").to.be.of.length(0);

        await factories.messageFactory.create({ conversationId: conversation.id });

        await sub.waitForResults();

        expect(sub.error).to.be.null
        expect(sub.results, "Event received for conversation subscribed to").to.be.of.length(1);
      })
    })
  });
})
