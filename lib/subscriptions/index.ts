import { Server, Socket }     from 'socket.io'
import logger                 from '../utils/logger'
import Redis                  from 'ioredis'
import { Cache, RedisEngine } from '../storage/cache'
import { waitForEvent }       from '../utils/async'
import { wire }               from './wire'

const { info } = logger('subscriptions');

const createAdapter = require('socket.io-ioredis');

export interface SubscrptionsConfig {
  redis?: Redis.RedisOptions
}

/**
 * Returns a socket.io server which handles subscriptions to Sunshine data
 * 
 * @exports
 * @param {SubscrptionsConfig} config
 * @returns {Server}
 */
export const subscriptions = async (config : SubscrptionsConfig) : Promise<Server> => {
  info('initializing socket.io server');

  // --- Create server

  const io = new Server({
    path: '/ws',
    serveClient: false
  });

  // --- Create subscription cache

  const cache = new Cache('subscriptions');

  // --- Handle optional Redis usage

  if (config.redis) {
    info('redis configuration detected');

    const pubClient = new Redis(config.redis);
    const subClient = pubClient.duplicate();
    
    io.adapter(createAdapter({ pubClient, subClient }));

    // We also use redis for our subscription logic
    cache.setEngine(new RedisEngine(pubClient));

    await waitForEvent('connect', pubClient, { timeout: 3000 });

    info('redis client connected');
  }
  
  // --- Wire up socket with listeners

  io.sockets.on('connection', (socket: Socket) => wire(socket, cache))

  return io;
}

export default subscriptions;
