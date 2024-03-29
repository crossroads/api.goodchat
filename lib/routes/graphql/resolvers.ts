import { Conversation, ConversationType, Customer, Message, Staff }               from "@prisma/client"
import { GraphQLContext, RootParent }                                             from "."
import { IResolvers, withFilter }                                                 from "apollo-server-koa"
import * as computer                                                              from "../../services/computer"
import db                                                                         from "../../db"
import _                                                                          from 'lodash'
import { Json }                                                                   from "../../typings/lang"
import {
  CollectionArgs,
  ConversationsArgs,
  CustomersArgs,
  MessagesArgs,
  NewConversationProps
} from "../../services/abilities"
import {
  MessageEvent,
  pubsub,
  PubSubAction,
  PubSubEvent,
  ReadReceiptEvent,
  ConversationEvent
} from "../../services/events"

// ---------------------------
// Types
// ---------------------------

export interface BaseArgs {}
export interface RecordArgs extends BaseArgs {
  id: number
}

export interface ConversationSelectArgs {
  conversationId: number
}

export interface MessageSubscriptionArgs extends Partial<ConversationSelectArgs> {
  actions?: PubSubAction[]
}

export interface ConversationSubscriptionArgs extends Partial<ConversationSelectArgs> {
  type?: ConversationType
}

export interface ConversationTagArgs {
  conversationId: number
  tagId: number
}

export interface SendMessageArgs {
  conversationId: number
  text: string
  metadata?: Json
  timestamp?: Date
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
    },

    customers(parent: RootParent, args : CustomersArgs, ctx : GraphQLContext) {
      return ctx.abilities.getCustomers(args)
    },

    goodchatProfile(parent: RootParent, args: BaseArgs, ctx : GraphQLContext) {
      return ctx.staff;
    },

    tags() {
      return db.tag.findMany();
    }
  },

  // ---------------------------
  // Mutations
  // ---------------------------

  Mutation: {
    sendMessage: (parent: RootParent, args: SendMessageArgs, ctx : GraphQLContext) => {
      return ctx.abilities.sendTextMessage(args.conversationId, args.text, {
        metadata: args.metadata,
        timestamp: args.timestamp
      });
    },

    startTyping: (parent: RootParent, args: { conversationId: number }, ctx : GraphQLContext) => {
      return ctx.activities.startTyping(args.conversationId);
    },

    stopTyping: (parent: RootParent, args: { conversationId: number }, ctx : GraphQLContext) => {
      return ctx.activities.stopTyping(args.conversationId);
    },

    markAsRead: (parent: RootParent, args: { conversationId: number }, ctx : GraphQLContext) => {
      return ctx.activities.markAsRead(args.conversationId);
    },

    createConversation: (parent: RootParent, args: NewConversationProps, ctx : GraphQLContext) => {
      return ctx.abilities.createConversation(args);
    },

    tagConversation: (parent: RootParent, args: ConversationTagArgs, ctx : GraphQLContext) => {
      return ctx.abilities.tagConversation(args.conversationId, args.tagId);
    },

    untagConversation: (parent: RootParent, args: ConversationTagArgs, ctx : GraphQLContext) => {
      return ctx.abilities.untagConversation(args.conversationId, args.tagId);
    }
  },

  // ---------------------------
  // Root Subscriptions
  // ---------------------------

  Subscription: {
    messageEvent: {
      resolve: _.identity,
      subscribe: withFilter(
        // --- PubSub event to listen to
        () => pubsub.asyncIterator(PubSubEvent.MESSAGE),
        // --- Predicate method to decide whether we should notify a user of this event
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
    },

    readReceiptEvent: {
      resolve: _.identity,
      subscribe: withFilter(
        // --- PubSub event to listen to
        () => pubsub.asyncIterator(PubSubEvent.READ_RECEIPT),
        // --- Predicate method to decide whether we should notify a user of this event
        async (payload: ReadReceiptEvent, args: ConversationSelectArgs, context: GraphQLContext) => {
          const receipt = payload.readReceipt;

          if (receipt.conversationId !== args.conversationId) {
            return false; // The user is not interested in this record
          }

          // Check if the user is allowed to view record
          return Boolean(
            await context.abilities.getConversationById(payload.readReceipt.conversationId)
          )
        }
      )
    },

    conversationEvent: {
      resolve: _.identity,
      subscribe: withFilter(
        // --- PubSub event to listen to
        () => pubsub.asyncIterator(PubSubEvent.CONVERSATION),
        // --- Predicate method to decide whether we should notify a user of this event
        async (payload: ConversationEvent, args: ConversationSubscriptionArgs, context: GraphQLContext) => {
          const conversation = payload.conversation;

          if (args.conversationId && conversation.id !== args.conversationId) {
            return false; // The user is not interested in this record
          }

          if (args.type && args.type !== conversation.type) {
            return false; // User is not listenning to this type of conversations
          }

          // Check if the user is allowed to view record
          return Boolean(
            await context.abilities.getConversationById(conversation.id)
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
    messages(parent : Conversation, args: MessagesArgs, ctx: GraphQLContext) {
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
    },

    tags(parent: Conversation) {
      return db.tag.findMany({
        where: {
          conversations: {
            some: {
              conversationId: {
                equals: parent.id
              }
            }
          }
        }
      })
    },

    readReceipts(parent: Conversation) {
      return db.readReceipt.findMany({
        where: {
          conversationId: parent.id
        }
      });
    },

    _computed(parent: Conversation) {
      //
      // We let the nested resolvers compute the properties to avoid
      // computation of fields we do not need
      //
      return {
        conversationId: parent.id
      };
    }
  },

  ConversationAggregates: {
    unreadMessageCount({ conversationId }, args: BaseArgs, ctx: GraphQLContext) {
      return computer.computeUnreadMessageCount(ctx.staff.id, conversationId);
    },

    totalMessageCount({ conversationId }) {
      return computer.computeMessageCount(conversationId);
    }
  },

  Staff: {
    /* get conversations of a staff member */
    conversations(parent: Staff, args: CollectionArgs, ctx: GraphQLContext) {
      return ctx.abilities.getConversations({ ...args, staffId: parent.id })
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
