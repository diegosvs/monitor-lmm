import fakeredis from 'fakeredis';

import log from '../../log';
import RedisDataStore from '../redis/RedisDataStore';


export default function createMemoryDataStore() {
  log.info('riv-us: using in-memory data store');

  const fakeClient = fakeredis.createClient(888, 'riv-us', { fast: true });

  return new RedisDataStore(fakeClient);
}