import log from '../log';
import deduplicatePosts from '../services/deduplicatePosts';


export default async function synchronize(feed, dataStore) {
  const feedId = feed.getFeedId();

  log.info(`synchronizing feed ${feedId}...`);

  try {
    const providers = feed.getProviders();
    const newFeedDates = await Promise.all(providers.map(p => synchronizeProvider(dataStore, p)));
    await mergeProviderUpdatesToFeed(feed, dataStore, providers, newFeedDates);

    log.info(`completed synchronizing feed ${feedId}`);
  } catch (e) {
    log.error(`error while synchronizing feed ${feedId}`, e);
    throw e;
  }
}

async function synchronizeProvider(dataStore, provider) {
  return await dataStore.synchronizeProvider(provider, async(savedLastPostDate, writeStore) => {
    const newPosts = await loadNewPostsFromProvider(provider, savedLastPostDate);
    if (!newPosts.length) {
      return savedLastPostDate;
    }
    writeStore.savePosts(newPosts);
    writeStore.addPostsToProvider(provider, newPosts);
    return newPosts[0].created_time;
  });
}

async function mergeProviderUpdatesToFeed(feed, dataStore, providers, newFeedDates) {
  return await dataStore.synchronizeFeed(feed, async(savedFeedDates, writeStore) => {
    const updates = collectUpdatesInFeed(providers, savedFeedDates, newFeedDates);

    if (!updates.length) {
      return savedFeedDates;
    }
    
    const posts = deduplicatePosts(feed.filterPosts(await getPostsFromUpdates(updates, dataStore)));
    writeStore.addPostsToFeed(feed, posts);

    return newFeedDates;
  });
}

function collectUpdatesInFeed(providers, savedFeedDates, newFeedDates) {
  return providers
    .map((provider, index) => {
      let startDate = savedFeedDates ? savedFeedDates[index] : null;
      const endDate = newFeedDates[index];

      if (!startDate && !endDate) {
        return null;
      }

      return {
        provider: provider,
        startDate: startDate,
        endDate: endDate
      };
    })
    .filter(update => !!update && (!update.startDate || update.endDate.isAfter(update.startDate)));
}

async function getPostsFromUpdates(updates, dataStore) {
  const posts = await Promise.all(updates.map(async(update) => {
      const posts = await dataStore.getProviderPosts(update.provider, update.endDate, update.startDate);

      if (update.startDate && update.startDate.isSame(posts[posts.length - 1].created_time)) {
        return posts.slice(0, -1);
      } else {
        return posts;
      }
    })
  );

  return posts.reduce((allPosts, providerPosts) => allPosts.concat(providerPosts), []);
}

async function loadNewPostsFromProvider(provider, savedPostDate) {
  async function loadNewPostsFromProviderRec(pageToken) {
    const newFeed = await provider.fetchPosts(20, pageToken);
    const thisPagePosts = [];

    for (let i = 0; i < newFeed.posts.length; i++) {
      const postDate = newFeed.posts[i].created_time;

      if (!!savedPostDate && postDate.isSameOrBefore(savedPostDate)) {
        return thisPagePosts;
      }

      thisPagePosts.push(newFeed.posts[i]);
    }

    if (!thisPagePosts.length || !newFeed.nextPageToken) {
      return thisPagePosts;
    }

    const nextPagePosts = await loadNewPostsFromProviderRec(newFeed.nextPageToken);
    return thisPagePosts.concat(nextPagePosts);
  }

  return await loadNewPostsFromProviderRec();
}
