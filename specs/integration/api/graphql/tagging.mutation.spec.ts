import { clearCurrentUser, setCurrentUser }  from '../../../spec_helpers/fake_auth'
import { ApolloServerTestClient }            from 'apollo-server-testing'
import { createGoodchatServer }              from '../../../spec_helpers/agent'
import { GoodChatPermissions }   from '../../../../lib/typings/goodchat'
import * as factories            from '../../../factories'
import { testMatrix }            from '../../../spec_helpers/utils'
import { expect }                from 'chai'
import { gql }                   from 'apollo-server-koa'
import db                        from '../../../../lib/db'
import _                         from 'lodash'
import {
  Conversation,
  ConversationType,
  Staff,
  Tag
} from '@prisma/client';

describe('GraphQL Tag/Untag mutations', () => {
  let tag                       : Tag
  let gqlAgent                  : ApolloServerTestClient
  let admin                     : Staff
  let customerStaff             : Staff
  let baseStaff                 : Staff
  let customerConversation      : Conversation
  let publicConversation        : Conversation
  let ownPrivateConversation    : Conversation
  let otherPrivateConversation  : Conversation

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  beforeEach(async () => {
    tag = await factories.tagFactory.create();

    // Create staff members
    admin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })
    customerStaff = await factories.staffFactory.create({ permissions: [GoodChatPermissions.CHAT_CUSTOMER] })
    baseStaff = await factories.staffFactory.create({ permissions: [] })

    // Create conversations
    customerConversation = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER })
    publicConversation = await factories.conversationFactory.create({ type: ConversationType.PUBLIC })
    otherPrivateConversation = await factories.conversationFactory.create({ type: ConversationType.PRIVATE })
    ownPrivateConversation = await factories.conversationFactory.create(
      { type: ConversationType.PRIVATE },
      { transient: { members: [admin, customerStaff, baseStaff] }}
    )
  });

  afterEach(() => {
    clearCurrentUser()
  })

  describe('Tagging/Untagging conversations', () => {

    testMatrix({
      row: "user",
      column: "conversation",
      rows: [
        ['admin', () => admin],
        ['customer staff', () => customerStaff],
        ['normal staff', () => baseStaff],
      ],
      columns: [
        ['public chat', () => publicConversation],
        ['my own private chat', () => ownPrivateConversation],
      ]
    }).do(({ row, column }) => {

      context(`As an ${row.name}`, () => {

        beforeEach(() => {
          setCurrentUser(row.getUser());
        })

        context('for a ' + column.name, () => {
          it('allows adding a tag to a conversation', async () => {

            const { errors, data } : any = await gqlAgent.mutate({
              mutation: gql`
                mutation TagConversation {
                  tagConversation(conversationId: ${column.getConversation().id}, tagId: ${tag.id}) {
                    id
                    tags {
                      name
                    }
                  }
                }
              `
            })

            expect(errors).to.be.undefined
            expect(data.tagConversation.tags).to.be.of.length(1)
            expect(data.tagConversation.tags[0].name).to.eq(tag.name)
          })

          it('allows removing a tag of a conversation', async () => {
            await db.conversationTags.create({
              data: {
                conversationId: column.getConversation().id,
                tagId: tag.id
              }
            })

            const { errors, data } : any = await gqlAgent.mutate({
              mutation: gql`
                mutation UntagConversation {
                  untagConversation(conversationId: ${column.getConversation().id}, tagId: ${tag.id}) {
                    id
                    tags {
                      name
                    }
                  }
                }
              `
            })

            expect(errors).to.be.undefined
            expect(data.untagConversation.tags).to.be.of.length(0)
          })
        })
      })
    });

    context('For customer chats', () => {

      context('As an admin', () => {
        beforeEach(() => {
          setCurrentUser(admin);
        })

        it('allows adding a tag to a conversation', async () => {

          const { errors, data } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation TagConversation {
                tagConversation(conversationId: ${customerConversation.id}, tagId: ${tag.id}) {
                  id
                  tags {
                    name
                  }
                }
              }
            `
          })

          expect(errors).to.be.undefined
          expect(data.tagConversation.tags).to.be.of.length(1)
          expect(data.tagConversation.tags[0].name).to.eq(tag.name)
        })

        it('allows removing a tag of a conversation', async () => {
          await db.conversationTags.create({
            data: {
              conversationId: customerConversation.id,
              tagId: tag.id
            }
          })

          const { errors, data } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation UntagConversation {
                untagConversation(conversationId: ${customerConversation.id}, tagId: ${tag.id}) {
                  id
                  tags {
                    name
                  }
                }
              }
            `
          })

          expect(errors).to.be.undefined
          expect(data.untagConversation.tags).to.be.of.length(0)
        });
      });

      context('As a customer staff', () => {
        beforeEach(() => {
          setCurrentUser(customerStaff);
        })

        it('allows adding a tag to a conversation', async () => {

          const { errors, data } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation TagConversation {
                tagConversation(conversationId: ${customerConversation.id}, tagId: ${tag.id}) {
                  id
                  tags {
                    name
                  }
                }
              }
            `
          })

          expect(errors).to.be.undefined
          expect(data.tagConversation.tags).to.be.of.length(1)
          expect(data.tagConversation.tags[0].name).to.eq(tag.name)
        })

        it('allows removing a tag of a conversation', async () => {
          await db.conversationTags.create({
            data: {
              conversationId: customerConversation.id,
              tagId: tag.id
            }
          })

          const { errors, data } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation UntagConversation {
                untagConversation(conversationId: ${customerConversation.id}, tagId: ${tag.id}) {
                  id
                  tags {
                    name
                  }
                }
              }
            `
          })

          expect(errors).to.be.undefined
          expect(data.untagConversation.tags).to.be.of.length(0)
        });
      });

      context('As a base staff', () => {
        beforeEach(() => {
          setCurrentUser(baseStaff);
        })

        it('prevents adding a tag to a conversation', async () => {

          const { errors, data } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation TagConversation {
                tagConversation(conversationId: ${customerConversation.id}, tagId: ${tag.id}) {
                  id
                  tags {
                    name
                  }
                }
              }
            `
          })

          expect(errors).to.be.of.length(1)
          expect(errors[0].message).to.eq("Resource not found")
        })

        it('prevents removing a tag of a conversation', async () => {
          await db.conversationTags.create({
            data: {
              conversationId: customerConversation.id,
              tagId: tag.id
            }
          })

          const { errors, data } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation UntagConversation {
                untagConversation(conversationId: ${customerConversation.id}, tagId: ${tag.id}) {
                  id
                  tags {
                    name
                  }
                }
              }
            `
          })

          expect(errors).to.be.of.length(1)
        });
      });
    });

    // context('for a non-customer chat', () => {
    //   let conversation : Conversation

    //   beforeEach(async () => {
    //     conversation = await factories.conversationFactory.create({
    //       type: ConversationType.PUBLIC
    //     })
    //   })

    //   it('doesnt send any event to sunshine when the user starts typing', async () => {
    //     const { errors, data } : any = await gqlAgent.mutate({
    //       mutation: gql`
    //         mutation StartTyping {
    //           startTyping(conversationId: ${conversation.id}) {
    //             id
    //             customerId
    //           }
    //         }
    //       `
    //     })
    //     expect(errors).to.be.undefined
    //     expect(sunshineActivityStub.callCount).to.eq(0)
    //   })

    //   it('doesnt send any event to sunshine when the user stops typing', async () => {
    //     const { errors, data } : any = await gqlAgent.mutate({
    //       mutation: gql`
    //         mutation StopTyping {
    //           stopTyping(conversationId: ${conversation.id}) {
    //             id
    //             customerId
    //           }
    //         }
    //       `
    //     })
    //     expect(errors).to.be.undefined
    //     expect(sunshineActivityStub.callCount).to.eq(0)
    //   })
    // })

    // context('for a chat I\'m not entitled to', () => {
    //   let conversation : Conversation

    //   beforeEach(async () => {
    //     conversation = await factories.conversationFactory.create({
    //       type: ConversationType.PRIVATE
    //     })
    //   })

    //   it('returns a 403 when I try to start typing', async () => {
    //     const { errors, data } : any = await gqlAgent.mutate({
    //       mutation: gql`
    //         mutation StartTyping {
    //           startTyping(conversationId: ${conversation.id}) {
    //             id
    //             customerId
    //           }
    //         }
    //       `
    //     })
    //     expect(errors).to.have.lengthOf(1);
    //     expect(errors[0].message).to.eq('Forbidden');
    //     expect(errors[0].extensions.code).to.eq('FORBIDDEN');
    //     expect(errors[0].extensions.exception).to.deep.eq({
    //       error: 'Forbidden',
    //       status: 403,
    //       type: 'ForbiddenError'
    //     })
    //   })

    //   it('returns a 403 when I try to stop typing', async () => {
    //     const { errors, data } : any = await gqlAgent.mutate({
    //       mutation: gql`
    //         mutation StopTyping {
    //           stopTyping(conversationId: ${conversation.id}) {
    //             id
    //             customerId
    //           }
    //         }
    //       `
    //     })
    //     expect(errors).to.have.lengthOf(1);
    //     expect(errors[0].message).to.eq('Forbidden');
    //     expect(errors[0].extensions.code).to.eq('FORBIDDEN');
    //     expect(errors[0].extensions.exception).to.deep.eq({
    //       error: 'Forbidden',
    //       status: 403,
    //       type: 'ForbiddenError'
    //     })
    //   })
    // })
  });
});
