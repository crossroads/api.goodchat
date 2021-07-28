import { Conversation, ConversationType } from ".prisma/client"
import { GoodChatPermissions }            from "../../lib/typings/goodchat"
import { Message, Staff }                 from "@prisma/client"
import { ActivitiesApi }                  from "sunshine-conversations-client"
import * as factories                     from '../factories'
import { activities }                     from "../../lib/services/activities"
import { before }                         from "mocha"
import { expect }                         from "chai"
import * as e2e                           from "../spec_helpers/e2e"
import { gql }                            from "apollo-server-core"
import sinon                              from "sinon"
import db                                 from "../../lib/db"
import _                                  from "lodash"

const USER_EXTERNAL_ID = '747';

describe('E2E/Subscriptions/ReadReceipts', () => {
  let serverInfo : e2e.TestServerInfo
  let gqlClient : e2e.TestApolloClient
  let customerConversation : Conversation
  let privateConversation : Conversation
  let myPivateConversation : Conversation
  let publicConversation : Conversation
  let customerConversationMessages : Message[]
  let privateConversationMessages : Message[]
  let myPivateConversationMessages : Message[]
  let publicConversationMessages : Message[]
  let user : Staff
  let otherUser : Staff
  let sunshineActivityStub : sinon.SinonStub

  // ---- Setup E2E Server

  before(async () => {
    serverInfo = await e2e.bootTestServer();
    sunshineActivityStub = sinon.stub(ActivitiesApi.prototype, 'postActivity');
  })

  after(async () => {
    await e2e.teardownTestServer();
    sunshineActivityStub.restore();
  })

  // ---- Seed database

  beforeEach(async () => {
    //
    // We create the staff member ahead of time just to create a private chat for it
    // Permissions will still be defined by the authentication server
    //
    user = await factories.staffFactory.create({ externalId: USER_EXTERNAL_ID })
    otherUser = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })

    customerConversation = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER })
    publicConversation = await factories.conversationFactory.create({ type: ConversationType.PUBLIC })
    privateConversation = await factories.conversationFactory.create({ type: ConversationType.PRIVATE }, {
      transient: { members: [otherUser] }
    })
    myPivateConversation = await factories.conversationFactory.create({ type: ConversationType.PRIVATE }, {
      transient: { members: [user, otherUser] }
    })

    const populateMessages = async (conversation: Conversation) => {
      const now = Date.now();

      return [
        await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now - 3000) }),
        await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now - 2000) }),
        await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now - 1000) })
      ]
    }

    customerConversationMessages = await populateMessages(customerConversation);
    privateConversationMessages = await populateMessages(privateConversation);
    myPivateConversationMessages = await populateMessages(myPivateConversation);
    publicConversationMessages = await populateMessages(publicConversation);

    gqlClient  = e2e.buildGraphQLClient(serverInfo)

    await gqlClient.waitForConnection();
  })

  afterEach(() => gqlClient.stop())

  describe('Receiving read receipt events', () => {

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
        "a customer chat": {
          getConversation: () => customerConversation,
          getMessages: () => customerConversationMessages
        },
        "a public chat": {
          getConversation: () => publicConversation,
          getMessages: () => publicConversationMessages
        },
        "my private chat": {
          getConversation: () => myPivateConversation,
          getMessages: () => myPivateConversationMessages
        }
      }, (ctx, type) => {

        it(`sends me read receipt updates from ${type}`, async () => {
          const sub = e2e.createSubscription({
            client: gqlClient,
            query: gql`
              subscription newMessages {
                readReceiptEvent(conversationId: ${ctx.getConversation().id}) {
                  action
                  readReceipt {
                    id
                    conversationId
                    lastReadMessageId
                  }
                }
              }
            `
          });

          expect(await db.readReceipt.count()).to.eq(0)

          // The other user reads the conversation
          const receipt = await activities(otherUser).markAsRead(ctx.getConversation().id)

          await sub.waitForResults();

          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.readReceiptEvent).to.exist

          const ev = sub.results[0].data.readReceiptEvent;

          expect(ev.action).to.eq('CREATE');
          expect(ev.readReceipt.id).to.eq(receipt.id);
          expect(ev.readReceipt.conversationId).to.eq(ctx.getConversation().id);
          expect(ev.readReceipt.lastReadMessageId).to.deep.eq(_.last(ctx.getMessages()).id);

          sub.disconnect();
        })
      });

      it('doesnt send me new read receipts from other private conversations', async () => {
        const sub = e2e.createSubscription({
          client: gqlClient,
          query: gql`
            subscription newMessages {
              readReceiptEvent(conversationId: ${privateConversation.id}) {
                action
                readReceipt {
                  id
                  conversationId
                  lastReadMessageId
                }
              }
            }
          `
        });

        await activities(otherUser).markAsRead(privateConversation.id)

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
        "a customer chat": {
          getConversation: () => customerConversation,
          getMessages: () => customerConversationMessages
        },
        "a public chat": {
          getConversation: () => publicConversation,
          getMessages: () => publicConversationMessages
        },
        "my private chat": {
          getConversation: () => myPivateConversation,
          getMessages: () => myPivateConversationMessages
        }
      }, (ctx, type) => {

        it(`sends me read receipt updates from ${type}`, async () => {
          const sub = e2e.createSubscription({
            client: gqlClient,
            query: gql`
              subscription newMessages {
                readReceiptEvent(conversationId: ${ctx.getConversation().id}) {
                  action
                  readReceipt {
                    id
                    conversationId
                    lastReadMessageId
                  }
                }
              }
            `
          });

          expect(await db.readReceipt.count()).to.eq(0)

          // The other user reads the conversation
          const receipt = await activities(otherUser).markAsRead(ctx.getConversation().id)

          await sub.waitForResults();

          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.readReceiptEvent).to.exist

          const ev = sub.results[0].data.readReceiptEvent;

          expect(ev.action).to.eq('CREATE');
          expect(ev.readReceipt.id).to.eq(receipt.id);
          expect(ev.readReceipt.conversationId).to.eq(ctx.getConversation().id);
          expect(ev.readReceipt.lastReadMessageId).to.deep.eq(_.last(ctx.getMessages()).id);

          sub.disconnect();
        })
      });

      it('doesnt send me new read receipts from other private conversations', async () => {
        const sub = e2e.createSubscription({
          client: gqlClient,
          query: gql`
            subscription newMessages {
              readReceiptEvent(conversationId: ${privateConversation.id}) {
                action
                readReceipt {
                  id
                  conversationId
                  lastReadMessageId
                }
              }
            }
          `
        });

        await activities(otherUser).markAsRead(privateConversation.id)

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
        "a public chat": {
          getConversation: () => publicConversation,
          getMessages: () => publicConversationMessages
        },
        "my private chat": {
          getConversation: () => myPivateConversation,
          getMessages: () => myPivateConversationMessages
        }
      }, (ctx, type) => {

        it(`sends me read receipt updates from ${type}`, async () => {
          const sub = e2e.createSubscription({
            client: gqlClient,
            query: gql`
              subscription newMessages {
                readReceiptEvent(conversationId: ${ctx.getConversation().id}) {
                  action
                  readReceipt {
                    id
                    conversationId
                    lastReadMessageId
                  }
                }
              }
            `
          });

          expect(await db.readReceipt.count()).to.eq(0)

          // The other user reads the conversation
          const receipt = await activities(otherUser).markAsRead(ctx.getConversation().id)

          await sub.waitForResults();

          expect(sub.results).to.be.of.length(1);
          expect(sub.results[0].data.readReceiptEvent).to.exist

          const ev = sub.results[0].data.readReceiptEvent;

          expect(ev.action).to.eq('CREATE');
          expect(ev.readReceipt.id).to.eq(receipt.id);
          expect(ev.readReceipt.conversationId).to.eq(ctx.getConversation().id);
          expect(ev.readReceipt.lastReadMessageId).to.deep.eq(_.last(ctx.getMessages()).id);

          sub.disconnect();
        })
      });

      it('doesnt send me new read receipts from customer conversations', async () => {
        const sub = e2e.createSubscription({
          client: gqlClient,
          query: gql`
            subscription newMessages {
              readReceiptEvent(conversationId: ${customerConversation.id}) {
                action
                readReceipt {
                  id
                  conversationId
                  lastReadMessageId
                }
              }
            }
          `
        });

        await activities(otherUser).markAsRead(customerConversation.id)

        await sub.wait();

        expect(sub.results).to.be.of.length(0);

        sub.disconnect();
      })

      it('doesnt send me new read receipts from other private conversations', async () => {
        const sub = e2e.createSubscription({
          client: gqlClient,
          query: gql`
            subscription newMessages {
              readReceiptEvent(conversationId: ${privateConversation.id}) {
                action
                readReceipt {
                  id
                  conversationId
                  lastReadMessageId
                }
              }
            }
          `
        });

        await activities(otherUser).markAsRead(privateConversation.id)

        await sub.wait();

        expect(sub.results).to.be.of.length(0);

        sub.disconnect();
      })
    });
  });
})
