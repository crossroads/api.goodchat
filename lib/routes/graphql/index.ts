import { ApolloServer, gql }                      from 'apollo-server-koa'
import { makeExecutableSchema }                   from "graphql-tools"
import * as scalars                               from 'graphql-scalars'
import { promises as fs }                         from 'fs'
import path                                       from 'path'
import resolvers                                  from './resolvers'
import logger                                     from '../../utils/logger'

const { info } = logger('graphql');

async function buildGraphQL() {

  info('loading schema');

  const typeDefs = gql`
    ${await fs.readFile(path.join(__dirname, 'schema.gql'))}
  `

  info('booting apollo')

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
      onConnect: (connectionParams, webSocket, context) => {
        info('client connected');
      },
      onDisconnect: (webSocket, context) => {
        info('client disconnected')
      }
    }
  });

  return server;
}

export default buildGraphQL;
