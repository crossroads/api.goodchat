import { Conversation, ConversationType, Customer, Message }               from "@prisma/client"
import { IResolvers, withFilter }                                          from "apollo-server-koa"
import db                                                                  from "../../db"
import _                                                                   from 'lodash'
import { MessageSubscription, pubsub, PubSubEvents }                       from "../../services/events"
import { GraphQLContext, RootParent }                                      from "."
import { CollectionArgs, ConversationArgs, MessageArgs }                   from "./data"

export type RecordArgs = {
  id: number
}

export type MessageSubscriptionArgs = {
  conversationId?: number
}

// ---------------------------
// Resolvers
// ---------------------------

const resolvers : IResolvers = {
  // ---------------------------
  // Root Queries
  // ---------------------------

  Query: {
    conversations(parent: RootParent, args : ConversationArgs, ctx : GraphQLContext) {
      return ctx.dataReader.getConversations(args);
    },

    conversation(parent: RootParent, args : RecordArgs, ctx : GraphQLContext) {
      return ctx.dataReader.getConversationById(args.id);
    }
  },

  // ---------------------------
  // Root Subscriptions
  // ---------------------------

  Subscription: {
    message: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(PubSubEvents.MESSAGE_CREATED),
        async (payload: MessageSubscription, args: MessageSubscriptionArgs, context : GraphQLContext) => {
          if (args.conversationId && payload.message.conversationId !== args.conversationId) {
            // The user is not interested in this record
            return false;
          }

          // Check if the user is allowed to view record
          return (await context.dataReader.getMessage(payload.message.id)) !== null;
        }
      )
    }
  },

  // ---------------------------
  // Nested resolvers
  // ---------------------------

  Conversation: {
    /* get messages of a conversation */
    messages(parent : Conversation, args: MessageArgs, ctx: GraphQLContext) {
      return ctx.dataReader.getMessages({
        ...args,
        conversationId: parent.id
      });
    },

    /* get customer of a conversation */
    customer(parent: Conversation) {
      if (parent.type !== ConversationType.CUSTOMER || !parent.customerId) {
        return null;
      }

      return db.customer.findUnique({
        where: {
          id: parent.customerId
        }
      })
    },

    /* get participants of a conversation */
    async staffs(parent: Conversation) {
      const records = await db.staffConversations.findMany({
        where: {
          conversationId: parent.id
        },
        include: {
          staff: true
        }
      })

      return _.map(records, 'staff');
    }
  },

  Customer: {

    /* get conversations of a customer */
    conversations(parent: Customer, args: CollectionArgs, ctx: GraphQLContext) {
      return ctx.dataReader.getConversations({
        ...args,
        customerId: parent.id
      })
    }
  },

  Message: {
    /* get conversation of a message */
    conversation(parent: Message, _, ctx: GraphQLContext) {
      return ctx.dataReader.getConversationById(parent.conversationId);
    }
  }
};

export default resolvers;
