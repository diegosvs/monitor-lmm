import Config from './config';
import createDataStore from './dataStore/createDataStore';
import createFeed from './feed/createFeed';
import synchronize from './services/synchronize';


export default function Rivus(baseConfig, configOverrides = {}) {
  const config = new Config(baseConfig, configOverrides);
  const feedPromise = createFeed(config);
  const dataStorePromise = createDataStore(config);

  const filter = {
    add: async(filter) => {
      const feed = await feedPromise;
      feed.addFilter(filter);
    },
    remove: async(filter) => {
      const feed = await feedPromise;
      feed.removeFilter(filter);
    }
  };

  const rivus = {
    get: (maybeLimit, maybeCallback) => {
      let limit = maybeLimit || 10;
      let callback = () => {};

      if (typeof maybeCallback === 'function') {
        callback = maybeCallback;
      } else if (maybeLimit === 'function') {
        limit = 10;
        callback = maybeLimit;
      }

      return this.getFeed({ limit }).then(function(results) {
        callback(null, results);
      }, function(error) {
        callback(error);
      });
    },
    getFeed: async(options) => {
      const feed = await feedPromise;
      const dataStore = await dataStorePromise;
      return await getFeed(feed, dataStore, options)
    },
    synchronize: async() => {
      const feed = await feedPromise;
      const dataStore = await dataStorePromise;
      return await synchronize(feed, dataStore);
    }
  };

  Object.defineProperty(rivus, 'filter', {
    get: () => filter
  });

  return rivus;
}

async function getFeed(feed, dataStore, options) {
  const feedOptions = cookGetFeedOptions(options);
  return await dataStore.getFeedPosts(feed, feedOptions.offset, feedOptions.limit);
}

function cookGetFeedOptions(inputOptions) {
  const options = {
    offset: 0,
    limit: 10
  };

  if (typeof inputOptions === 'number') {
    Object.assign(options, { limit: inputOptions });

  } else if (typeof inputOptions === 'object' && !Array.isArray(inputOptions)) {
    Object.assign(options, inputOptions);
  }

  return options;
}
