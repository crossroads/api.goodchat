import { goodchat }                                                   from "../..";
import http                                                           from 'http'
import { promisify }                                                  from "util";
import { WebSocketLink }                                              from '@apollo/client/link/ws'
import { getMainDefinition }                                          from '@apollo/client/utilities'
import ws                                                             from 'ws'
import fetch                                                          from 'cross-fetch'
import { AuthPayload }                                                from "../../lib/typings/goodchat";
import nock                                                           from "nock";
import { FAKE_AUTH_ENDPOINT, FAKE_AUTH_HOST, WEBHOOK_AUTH_CONFIG }    from "../samples/config";
import _                                                              from "lodash";
import {
  split,
  HttpLink,
  ApolloClient,
  InMemoryCache,
  DocumentNode
} from '@apollo/client/core'

let server : http.Server
let url    : string
let port   : number

let host = '127.0.0.1'

export type TestServerInfo = {
  url:  string
  port: number
  host: string
}

async function findPort(from: number, to: number) : Promise<number> {
  return new Promise((done) => {
    require('find-port')(host, from, to, (ports : number[]) => {
      done(ports[0]);
    });
  })
}

/**
 * Boots up a GoodChat server, and returns it's URL
 *
 * @export
 * @returns {string}
 */
export async function bootTestServer() : Promise<TestServerInfo> {
  if (url) {
    return { url, host, port }
  }

  const [koa, apollo] = await goodchat();

  server = http.createServer(koa.callback());

  apollo.installSubscriptionHandlers(server);

  port = await findPort(8001, 8010);

  const listen = promisify(server.listen.bind(server)) as any;

  await listen(port);

  url = `http://${host}:${port}`;

  return {
    url,
    host,
    port
  }
}

/**
 * Destroys any running GoodChat server
 *
 * @export
 */
export async function teardownTestServer() {
  if (server) {
    await promisify(server.close.bind(server))();
    server = null;
    url    = null;
    port   = null;
  }
}

/**
 * Our test apollo client <3
 *
 * @export
 * @class TestApolloClient
 * @extends {ApolloClient<any>}
 */
export class TestApolloClient extends ApolloClient<any> {
  private wsLink : WebSocketLink

  constructor(serverInfo: TestServerInfo) {
    const { url, host } = serverInfo;

    const wsLink = new WebSocketLink({
      uri: `ws://${host}:${port}/graphql/subscriptions`,
      webSocketImpl: ws,
      options: {
        reconnect: false,
        connectionParams: {
          'Authorization': 'Bearer dummy'
        }
      }
    });

    const httpLink = new HttpLink({
      uri: `http://${host}:${port}/graphql`,
      fetch
    });

    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink,
    );

    super({
      link: splitLink,
      cache: new InMemoryCache()
    });

    this.wsLink = wsLink
  }

  stop() {
    super.stop();
    (this.wsLink as any).subscriptionClient.close();
  }
}

/**
 * Creates an apollo client for a given host/port
 *
 * @export
 * @param {string} host
 * @param {(string|number)} port
 * @returns
 */
export function buildGraphQLClient(serverInfo: TestServerInfo) : TestApolloClient {
  return new TestApolloClient(serverInfo);
}


/**
 * Fakes the response from the auth server
 *
 * @export
 * @param {AuthPayload} payload
 */
export function mockAuthServerResponse(payload: AuthPayload) {
  nock(FAKE_AUTH_HOST)
    .persist()
    .post(FAKE_AUTH_ENDPOINT)
    .reply(200, payload)
}

/**
 * Removes all fake api mocks
 *
 * @export
 */
export function cleanAllApiMocks() {
  nock.cleanAll();
}


type SubscriptionTestParams = {
  client: TestApolloClient,
  query: DocumentNode,
  variables?: Record<any, any>
}

/**
 * Creates a subscription
 *
 * @export
 * @param {SubscriptionTestParams} params
 * @returns
 */
export function createSubscription(params: SubscriptionTestParams) {
  const results : any[] = [];

  let error : any = null;

  let observer = params.client.subscribe({
    errorPolicy: 'all',
    query: params.query,
    variables: params.variables || {}
  }).subscribe({
    next(data) { results.push(data) },
    error: (err) => { error = err }
  })

  return {
    results,
    observer,

    disconnect() {
      observer.unsubscribe();
    },

    wait(ms : number = 100) {
      return new Promise(done => {
        setTimeout(() => { done(null) }, ms);
      });
    },

    waitForResults(opts : { len?: number, timeout?: number } = {}) {
      return new Promise((done, fail) => {
        let step    = 2;
        let sum     = 0;
        let timeout = opts.timeout ?? 200;
        let len     = opts.len ?? 1;

        const interval = setInterval(() => {
          if (!error && results.length >= len) {
            clearInterval(interval);
            return done(results);
          }
          if (error || sum >= timeout) {
            error = error || new Error(`Timeout: subscription did not receive the expected results after ${timeout}ms`)
            clearInterval(interval);
            return fail(error);
          }
          sum += step
        }, step);
      })
    },

    get triggerCount() {
      return results.length;
    },

    get error () {
      return error;
    }
  }

}

