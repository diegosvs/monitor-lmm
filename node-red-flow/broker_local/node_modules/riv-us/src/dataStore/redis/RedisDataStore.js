import moment from 'moment';

import log from '../../log';
import { momentize, demomentize } from '../../services/momentize';

const Keys = {
  post: id => `rivus:posts:${id}`,
  providerLastPostDate: p => `rivus:anchor:provider:${p.feedId}`,
  providerPostIds: p => `rivus:provider:${p.feedId}`,
  feedLastPostDates: f => `rivus:anchor:feed:${f.getFeedId()}`,
  feedPostIds: f => `rivus:feed:${f.getFeedId()}`
};


export default class RedisDataStore {
  constructor(client) {
    this.client = client;
  }

  async synchronizeProvider(provider, updater) {
    const lastPostDateKey = Keys.providerLastPostDate(provider);

    await redisQuery(this.client, 'watch', lastPostDateKey);

    const providerLastPostDate = dateFromRedis(await redisQuery(this.client, 'get', lastPostDateKey));

    const writeStore = new RedisWriteDataStore(this.client);

    try {
      const newProviderLastPostDate = await updater(providerLastPostDate, writeStore);
      writeStore.saveLastProviderPostDate(provider, newProviderLastPostDate);
      await writeStore.commit();
      return newProviderLastPostDate;

    } catch (e) {
      log.warn(`Redis: error while synchronizing provider \`${provider.feedId}\`:`, e);
      writeStore.discard();
      throw e;
    }
  }

  async synchronizeFeed(feed, updater) {
    const lastPostDatesKey = Keys.feedLastPostDates(feed);

    await redisQuery(this.client, 'watch', lastPostDatesKey);

    let lastPostDates = await redisQuery(this.client, 'get', lastPostDatesKey);
    if (lastPostDates) {
      lastPostDates = JSON.parse(lastPostDates);
      if (Array.isArray(lastPostDates)) {
        lastPostDates = lastPostDates.map(dateFromRedis);
      } else {
        lastPostDates = null;
      }
    }

    const writeStore = new RedisWriteDataStore(this.client);

    try {
      const newLastPostDates = await updater(lastPostDates, writeStore);
      writeStore.saveLastFeedPostDates(feed, newLastPostDates);
      await writeStore.commit();
      return newLastPostDates;

    } catch (e) {
      log.warn(`Redis: error while synchronizing feed \`${feed.getFeedId()}\`:`, e);
      writeStore.discard();
      throw e;
    }
  }

  async getFeedPosts(feed, offset = 0, limit = 10) {
    const postIds = await redisQuery(
      this.client,
      'zrevrangebyscore',
      Keys.feedPostIds(feed),
      Number.MAX_VALUE,
      0,
      'LIMIT',
      offset,
      limit
    );

    return await loadPostsByIds(this.client, postIds);
  }

  async getProviderPosts(provider, endDate = null, startDate = null) {
    const postIds = await redisQuery(
      this.client,
      'zrangebyscore',
      Keys.providerPostIds(provider),
      dateToRedis(startDate, '-inf'),
      dateToRedis(endDate, '+inf')
    );

    return await loadPostsByIds(this.client, postIds);
  }

  async drop() {
    return await redisQuery(this.client, 'flushdb');
  }
}


class RedisWriteDataStore {
  constructor(client) {
    this.client = client.multi();
  }

  async commit() {
    return await redisQuery(this.client, 'exec');
  }

  discard() {
    redisOneOffQuery(this.client, 'discard');
  }

  savePosts(posts) {
    if (!posts.length) {
      return;
    }
    const args = posts.reduce((arr, post) => [...arr, Keys.post(post.id), JSON.stringify(demomentize(post))], []);
    redisOneOffQuery(this.client, 'mset', ...args)
  }

  saveLastProviderPostDate(provider, date) {
    redisOneOffQuery(this.client, 'set', Keys.providerLastPostDate(provider), dateToRedis(date));
  }

  saveLastFeedPostDates(feed, dates) {
    redisOneOffQuery(
      this.client,
      'set',
      Keys.feedLastPostDates(feed),
      dates ? JSON.stringify(dates.map(dateToRedis)) : null
    );
  }

  addPostsToFeed(feed, posts) {
    if (!posts.length) {
      return;
    }

    const args = posts.reduce((arr, post) => [...arr, dateToRedis(post.created_time), post.id], []);
    redisOneOffQuery(this.client, 'zadd', Keys.feedPostIds(feed), ...args);
  }

  addPostsToProvider(provider, posts) {
    if (!posts.length) {
      return;
    }

    const args = posts.reduce((arr, post) => [...arr, dateToRedis(post.created_time), post.id], []);
    redisOneOffQuery(this.client, 'zadd', Keys.providerPostIds(provider), ...args);
  }
}

async function loadPostsByIds(client, postIds) {
  if (!postIds.length) {
    return [];
  }
  return (await redisQuery(client, 'mget', ...postIds.map(Keys.post)))
    .map(data => momentize(JSON.parse(data)));
}

async function redisQuery(client, command, ...args) {
  log.debug(`Redis: ${command}`, ...args.map(arg => `"${arg}"`));

  return await new Promise((resolve, reject) => {
    if (!client[command]) {
      reject(new Error(`Redis: undefined command ${command}`));
      return;
    }

    client[command](...[...args, (err, response) => {
      if (err) {
        log.warn(`Redis: error ${command}`, ...args.map(arg => `"${arg}"`), ':', err);
        reject(new Error(`Redis: ${err.message}`));
      } else {
        resolve(response);
      }
    }]);
  });
}

function redisOneOffQuery(client, command, ...args) {
  log.debug(`Redis: ${command}`, ...args.map(arg => `"${arg}"`));

  if (!client[command]) {
    throw new Error(`Redis: undefined command ${command}`);
  }

  client[command](...args);
}

function dateToRedis(date, defaultValue) {
  return date ? date.valueOf() : defaultValue;
}

function dateFromRedis(redisDate) {
  return redisDate ? moment(Number(redisDate)) : null;
}