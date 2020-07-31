export default class FeedMock {
  constructor(id, providers) {
    this._feedId = id;
    this._providers = providers;
  }

  getProviders() {
    return this._providers;
  }

  getFeedId() {
    return this._feedId;
  }

  filterPosts(posts) {
    return posts;
  }

  async fetchPosts(options) {
    const feeds = await Promise.all(this._providers.map(p => p.fetchPosts(options.limit)));

    return feeds
      .reduce((allPosts, feed) => allPosts.concat(feed.posts), [])
      .sort(postDateDescComparator);
  }
}

function postDateDescComparator(p1, p2) {
  // moment.js date/time comparison
  return p2.created_time.diff(p1.created_time);
}
