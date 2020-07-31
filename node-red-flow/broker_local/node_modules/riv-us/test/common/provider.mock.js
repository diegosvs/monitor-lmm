export default class ProviderMock {
  constructor(id, posts) {
    Object.defineProperty(this, 'feedId', {
      get: () => id
    });

    this._posts = [];
    posts.forEach(p => this.addPost(p));
  }

  async fetchPosts(limit = 10, pageToken = null) {
    const start = pageToken ? pageToken : 0;
    const end = start + limit;

    return {
      posts: this._posts.slice(start, end),
      nextPageToken: end < this._posts.length ? end : null
    };
  }

  addPost(post) {
    this._posts.push(post);
    this._posts.sort(postDateDescComparator);
  }
}

function postDateDescComparator(p1, p2) {
  // moment.js date/time comparison
  return p2.created_time.diff(p1.created_time);
}