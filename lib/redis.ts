import config           from "./config"
import logger           from "./utils/logger"
import Redis            from 'ioredis'
import { gracefulExit } from "./utils/process";

const { error } = logger('redis');

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

gracefulExit(closeAllConnections);

