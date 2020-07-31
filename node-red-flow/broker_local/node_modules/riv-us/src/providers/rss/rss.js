import feed from 'feed-read';
import moment from 'moment';

import log from '../../log';


export default function createRssProvider(config, overrides = {}) {
  const feedUrl = overrides && overrides.feedUrl || config.mandatory('feed_url');
  const feedId = overrides && overrides.feedId || `rss:${feedUrl}`;
  const providerName = overrides && overrides.providerName || 'rss';

  const provider = {
    fetchPosts: async () => {
      log.verbose(`provider \`${feedId}\`: fetch posts...`);

      return await new Promise((resolve, reject) => {
        feed(feedUrl, (err, response) => {
          try {
            if (err) {
              throw err;
            }

            const posts = response.map(p => cookFeedItem(feedId, providerName, p));

            log.verbose(`provider \`${feedId}\`: fetch complete: ${posts.length} posts`);
            resolve({
              posts: posts,
              nextPageToken: null
            });
          } catch (e) {
            log.error(`provider \`${feedId}\`: error calling RSS: `, err);
            reject(e);
          }
        });
      })
    }
  };
  Object.defineProperty(provider, 'feedId', {
    get: () => feedId
  });
  return provider;
}

function cookFeedItem(feedId, providerName, original) {
  delete original.feed; // feed-read service stuff
  return {
    id: `${providerName}:${original.link}`,
    title: original.title,
    content: original.content,
    created_time: moment(new Date(original.published).getTime()),
    images: images(original.content),
    link: original.link,
    extra: { original },
    source: {
      name: providerName,
      feed: feedId
    }
  };
}

function images(content) {
  const rex = /src="([^"]*)"/i;
  const match = rex.exec(content);
  if (Array.isArray(match) && match[1]) {
    return {
      thumbnail: {
        url: match[1]
      }
    };
  }
  return {};
}
