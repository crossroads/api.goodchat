import { abilities, Abilities }                          from '../../services/abilities'
import { activities, Activities }                        from '../../services/activities'
import { ApolloError, ApolloServer, gql }                from 'apollo-server-koa'
import { makeExecutableSchema }                          from "graphql-tools"
import { promises as fs }                                from 'fs'
import { GoodchatError }                                 from '../../utils/errors'
import * as scalars                                      from 'graphql-scalars'
import authService                                       from '../../services/authentication'
import { Staff }                                         from '@prisma/client'
import resolvers                                         from './resolvers'
import logger                                            from '../../utils/logger'
import path                                              from 'path'

const { info } = logger('graphql');

export interface GraphQLContext {
  staff:      Staff,
  abilities:  Abilities,
  activities: Activities
}

export interface RootParent {
  // empty for now
}

/**
 * Creates an Apollo GraphQL Server
 *
 * @returns
 */
async function buildGraphQL() {

  info('loading schema');

  const typeDefs = gql`
    ${await fs.readFile(path.join(__dirname, 'schema.gql'))}
  `

  info('booting apollo')

  const createContext = async (headers: Record<string, string>) : Promise<GraphQLContext> => {
    try {
      const staff = await authService.authenticateHeaders(headers);
      return {
        staff,
        abilities: abilities(staff),
        activities: activities(staff)
      }
    } catch (e) {
      throw (e instanceof GoodchatError) ? e.toApolloError() : e;
    }
  }

  const server = new ApolloServer({
    schema: makeExecutableSchema({
      typeDefs: [
        ...scalars.typeDefs,
        typeDefs
      ],
      resolvers: [
        scalars.resolvers,
        resolvers,
      ]
    }),
    subscriptions: {
      path: '/graphql/subscriptions',
      onConnect: async (params) : Promise<GraphQLContext> => {
        const ctx = await createContext(params as Record<string, string>);
        info(`User ${ctx.staff.id} connected`);
        return ctx;
      },
      onDisconnect: () => {
        info(`User disconnected`)
      }
    },
    rootValue: () : RootParent => {
      return {};
    },
    context: ({ ctx, connection }) : Promise<GraphQLContext> => {
      return (
        connection ?
          connection.context :
          createContext(ctx.request.headers)
      )
    },
    formatError(err) {
      const { originalError } = err;
      if (originalError instanceof GoodchatError) {
        const apolloError = err as ApolloError;
        const { extensions, message } = originalError.toApolloError();
        apolloError.message = message;
        apolloError.extensions = {
          ...err.extensions,
          ...extensions
        }
      }
      return err;
    }
  });

  return server;
}

export default buildGraphQL;
