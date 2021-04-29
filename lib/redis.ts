import config  from "./config"
import logger  from "./utils/logger"
import Redis   from 'ioredis'

const { error } = logger('queue');

const connections : Redis.Redis[] = [];

export function createConnection() : Redis.Redis {
  const connection = new Redis(config.redis.url);

  connection.on('error', error)

  connections.push(connection)

  return connection;
}

export function closeAllConnections() {
  connections.forEach(c => c.disconnect())
}

