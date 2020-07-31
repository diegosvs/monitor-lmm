import redis from 'redis';

import log from '../../log';


export default function createRedisClient(storeName, config) {
  const params = {};

  if (config.optional('path')) {
    params.path = config.optional('path');
  } else {
    params.host = config.optional('host', '127.0.0.1');
    params.port = config.optional('port', 6379);
  }

  if (config.optional('password')) {
    params.password = config.optional('password');
  }

  log.debug(`${storeName}: using Redis data store: `, params);

  const client = redis.createClient(params);

  client.on('error', e => log.error(`${storeName}: redis store: `, e));
  client.on('warning', (...args) => log.warn(...[`${storeName}: redis store: warning: `, ...args]));
  client.on('reconnecting', () => log.warn(`${storeName}: redis store: reconnecting to server...`));
  client.on('connect', () => {
    log.info(`${storeName}: redis store: connected to server`);
  });

  return client;
}