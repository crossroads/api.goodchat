import { MessageEvent, pubsub, PubSubAction, PubSubEvent }     from "../../services/events"
import { Conversation, ConversationType, Customer, Message }   from "@prisma/client"
import { CollectionArgs, ConversationsArgs, MessageArgs }      from "../../services/abilities"
import { GraphQLContext, RootParent }                          from "."
import { IResolvers, withFilter }                              from "apollo-server-koa"
import db                                                      from "../../db"
import _                                                       from 'lodash'

// ---------------------------
// Types
// ---------------------------

export interface BaseArgs {}
export interface RecordArgs extends BaseArgs {
  id: number
}

export type MessageSubscriptionArgs = {
  conversationId?: number,
  actions?: PubSubAction[]
}

export type SendMessageArgs = {
  conversationId: number
  text: string
}

// ---------------------------
// Resolvers
// ---------------------------

const resolvers : IResolvers = {
  // ---------------------------
  // Root Queries
  // ---------------------------

  Query: {
    conversations(parent: RootParent, args : ConversationsArgs, ctx : GraphQLContext) {
      return ctx.abilities.getConversations(args);
    },

    conversation(parent: RootParent, args : RecordArgs, ctx : GraphQLContext) {
      return ctx.abilities.getConversationById(args.id);
    }
  },

  // ---------------------------
  // Mutations
  // ---------------------------

  Mutation: {
    sendMessage: async (parent: RootParent, args: SendMessageArgs, ctx : GraphQLContext) => {
      return ctx.abilities.sendTextMessage(args.conversationId, args.text);
    },

    startTyping: async (parent: RootParent, args: { conversationId: number }, ctx : GraphQLContext) => {
      return ctx.activities.startTyping(args.conversationId);
    },

    stopTyping: async (parent: RootParent, args: { conversationId: number }, ctx : GraphQLContext) => {
      return ctx.activities.stopTyping(args.conversationId);
    },

    markAsRead: async (parent: RootParent, args: { conversationId: number }, ctx : GraphQLContext) => {
      return ctx.activities.markAsRead(args.conversationId);
    }
  },

  // ---------------------------
  // Root Subscriptions
  // ---------------------------

  Subscription: {
    messageEvent: {
      resolve: _.identity,
      subscribe: withFilter(
        //
        // PubSub event to listen to
        //
        () => pubsub.asyncIterator(PubSubEvent.MESSAGE),
        //
        // Predicate method to decide whether we should notify a user of this event
        //
        async (payload: MessageEvent, args: MessageSubscriptionArgs, context: GraphQLContext) => {
          if (args.conversationId && payload.message.conversationId !== args.conversationId) {
            return false; // The user is not interested in this record
          }

          if (args.actions && !_.includes(args.actions, payload.action)) {
            return false; // The user is not interested in this kind of action
          }

          // Check if the user is allowed to view record
          return Boolean(
            await context.abilities.getConversationById(payload.message.conversationId)
          )
        }
      )
    }
  },

  // ---------------------------
  // Enum resolvers
  // ---------------------------

  SubscriptionAction: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete'
  },

  ConversationType: {
    CUSTOMER: 'CUSTOMER',
    PRIVATE: 'PRIVATE',
    PUBLIC: 'PUBLIC'
  },

  // ---------------------------
  // Nested resolvers
  // ---------------------------

  Conversation: {
    /* get messages of a conversation */
    messages(parent : Conversation, args: MessageArgs, ctx: GraphQLContext) {
      return ctx.abilities.getMessages({
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
      return ctx.abilities.getConversations({
        ...args,
        customerId: parent.id
      })
    }
  },

  Message: {
    /* get conversation of a message */
    conversation(parent: Message, args: BaseArgs, ctx: GraphQLContext) {
      return ctx.abilities.getConversationById(parent.conversationId);
    }
  }
};

export default resolvers;
