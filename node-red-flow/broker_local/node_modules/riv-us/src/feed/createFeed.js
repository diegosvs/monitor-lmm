import createProvider from '../providers/createProvider';

import { ResolvedConfig } from '../config';
import getFeedId from './getFeedId';


export default async function createFeed(config) {
  const loadedConfig = await config.load();
  const providers = loadedConfig.mandatory('providers').map(providerAttributes =>
    createProvider(new ResolvedConfig(providerAttributes)));

  const filters = [];

  return {
    getProviders: () => providers,
    getFeedId: () => getFeedId(providers),
    addFilter: (filter) => {
      if (typeof filter !== 'function') {
        throw new Error('filter must be a function');
      }

      const i = filters.indexOf(filter);
      if (i < 0) {
        filters.push(filter);
      }
    },
    removeFilter: (filter) => {
      if (typeof filter !== 'function') {
        throw new Error('filter must be a function');
      }

      const i = filters.indexOf(filter);
      if (i >= 0) {
        filters.splice(i, 1);
      }
    },
    filterPosts: (posts) => {
      if (filters.length) {
        return posts.filter(p => filters.every(f => f(p)));
      }

      return posts;
    }
  };
}
