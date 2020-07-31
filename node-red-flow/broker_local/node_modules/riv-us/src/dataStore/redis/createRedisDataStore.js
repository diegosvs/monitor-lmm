import RedisDataStore from './RedisDataStore';
import createRedisClient from './createRedisClient';


export default function createRedisDataStore(config) {
  return new RedisDataStore(createRedisClient('riv-us', config));
}
