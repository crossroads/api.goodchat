import { ApolloServer, gql }                 from 'apollo-server-koa'
import { makeExecutableSchema }              from "graphql-tools"
import * as scalars                          from 'graphql-scalars'
import { promises as fs }                    from 'fs'
import path                                  from 'path'
import _                                     from 'lodash'
import resolvers                             from './resolvers'
import logger                                from '../../utils/logger'
import authService                           from '../../services/auth_service'
import { GoodChatConfig }                    from '../../typings/goodchat'
import { Staff }                             from '@prisma/client'
import { dataReader, DataReader }            from './data'

const { info } = logger('graphql');

export interface GraphQLContext {
  staff: Staff,
  dataReader: DataReader
}

/**
 * Creates an Apollo GraphQL Server
 *
 * @param {GoodChatConfig} config
 * @returns
 */
async function buildGraphQL(config: GoodChatConfig) {

  info('loading schema');

  const typeDefs = gql`
    ${await fs.readFile(path.join(__dirname, 'schema.gql'))}
  `

  info('booting apollo')

  const createContext = async (headers: Object) : Promise<GraphQLContext> => {
    const staff = await authService(config).authenticateHeaders(headers);
    return {
      staff,
      dataReader: dataReader(staff)
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
      path: '/subscriptions',
      onConnect: async (params) : Promise<GraphQLContext> => {
        const ctx = await createContext(params);
        info(`User ${ctx.staff.id} connected`);        
        return ctx;
      },
      onDisconnect: (webSocket, context) => {
        info('client disconnected')
      }
    },
    context: ({ ctx, connection }) : Promise<GraphQLContext> => {
      return (
        connection ?
          connection.context : 
          createContext(ctx.request.headers)
      )
    },
  });

  return server;
}

export default buildGraphQL;
