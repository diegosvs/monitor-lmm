import createRedisDataStore from './redis/createRedisDataStore';
import createMemoryDataStore from './memory/createMemoryDataStore';


export default async function createDataStore(config) {
  const dataStoreConfig = (await config.load()).section('dataStore', { optional: true });

  if (dataStoreConfig && dataStoreConfig.optional('type') === 'redis') {
    return createRedisDataStore(dataStoreConfig.section('settings'));
  } else {
    return createMemoryDataStore();
  }
}
