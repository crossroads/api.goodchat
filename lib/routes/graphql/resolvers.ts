import { Conversation, Customer, Message }               from "@prisma/client"
import { IResolvers, withFilter }                        from "apollo-server-koa"
import db                                                from "../../db"
import _                                                 from 'lodash'
import { pubsub, PubSubEvents }                          from "../../services/events"

// ---------------------------
// Types
// ---------------------------

type Pagination = {
  limit:   number
  offset:  number
}

type ListArgs = Partial<Pagination>

type ConversationArgs = ListArgs & {
  private?: boolean
}

type RecordArgs = {
  id: number
}

type WhereClause = Record<string, any>

// ---------------------------
// Helpers
// ---------------------------

const readPages = (args: ListArgs) : Pagination => {
  return {
    limit: _.clamp(args.limit || 25, 0, 100),
    offset: _.clamp(args.offset || 0, 0, 100),
  }
}

const whereFilters = (args: any, props: string[]) : { where?: WhereClause } => {
  const whereClause = _.reduce(props, (where, prop) => {
    return _.has(args, prop) ? { ...where, [prop]: args[prop] } : where
  }, {} as WhereClause);

  if (_.keys(whereClause).length === 0) {
    return {};
  }

  return { where: whereClause }
}

// ---------------------------
// Resolvers
// ---------------------------

const resolvers : IResolvers = {
  // ---------------------------
  // Root Queries
  // ---------------------------

  Query: {

    conversations(_, args : ConversationArgs) {
      const { offset, limit } = readPages(args);

      // TODO: a user can only see the private conversations he/she is a member of

      return db.conversation.findMany({
        skip: offset,
        take: limit,
        ...whereFilters(args, ['private']),
        orderBy: [
          { updatedAt: 'desc' },
          { id: 'desc' }
        ]
      });
    },

    conversation(_, args : RecordArgs) {
      const { id } = args;

      return db.conversation.findUnique({ 
        where: { id }
      })
    }
  },

  // ---------------------------
  // Root Subscriptions
  // ---------------------------

  Subscription: {
    message: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(PubSubEvents.MESSAGE_CREATED),
        (payload, args) => {
          if (!args?.conversationId) return true;
          return (payload.message.conversationId === args.conversationId);
        }
      )
    }
  },

  // ---------------------------
  // Nested resolvers
  // ---------------------------

  Conversation: {
    /* get messages of a conversation */
    messages(parent : Conversation, args: ListArgs) {
      const { offset, limit } = readPages(args);

      return db.message.findMany({
        skip: offset,
        take: limit,
        where: {
          conversationId: parent.id
        }
      })
    },

    /* get customer of a conversation */
    customer(parent: Conversation) {
      if (parent.private || !parent.customerId) {
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
    conversations(parent: Customer, args: ListArgs) {
      const { offset, limit } = readPages(args);

      return db.conversation.findMany({
        skip: offset,
        take: limit,
        where: {
          customerId: parent.id
        }
      })
    }
  },

  Message: {
    /* get conversation of a message */
    conversation(parent: Message) {
      return db.conversation.findUnique({
        where: {
          id: parent.conversationId
        }
      })
    }
  }
};

export default resolvers;
