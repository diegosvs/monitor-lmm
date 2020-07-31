import TwitterApi from 'twitter';
import moment from 'moment';


export default function createTwitterProvider(config) {
  const user = config.mandatory('user');
  const feedId = feedIdForUser(user);

  const twitter = new TwitterApi({
    consumer_key: config.mandatory('consumer_key'),
    consumer_secret: config.mandatory('consumer_secret'),
    access_token_key: config.mandatory('access_token_key'),
    access_token_secret: config.mandatory('access_token_secret')
  });

  const provider = {
    fetchPosts: async(limit = 10, pageToken = null) => {
      const params = {
        screen_name: user,
        count: limit
      };

      if (pageToken) {
        params.max_id = pageToken;
      }

      return await new Promise((resolve, reject) => {
        twitter.get('statuses/user_timeline', params, (err, tweets) => {
          if (err) {
            reject(new Error(`failed calling Twitter: ${err.message}`));
          } else {
            const items = tweets.map(t => cookFeedPost(feedId, t));
            resolve({
              posts: tweets.map(t => cookFeedPost(feedId, t)),
              nextPageToken: items.length ? items.slice(-1)[0].id : null
            });
          }
        });
      });
    }
  };
  Object.defineProperty(provider, 'feedId', {
    get: () => feedId
  });
  return provider;
}

function cookFeedPost(feedId, original) {
  return {
    id: `twi:${original.id}`,
    title: null,
    content: original.text,
    created_time: moment(new Date(original.created_at).getTime()),
    images: images(original.extended_entities),
    extra: { original },
    link: 'https://twitter.com/' + original.user.screen_name + '/status/' + original.id_str,
    source: {
      name: 'twitter',
      feed: feedId
    }
  };
}

function images(entities) {
  if (!entities || !Array.isArray(entities.media) || !entities.media[0]) {
    return {};
  }

  return {
    thumbnail: {
      url: entities.media[0].media_url_https || entities.media[0].media_url
    }
  };
}

function feedIdForUser(user) {
  return `twitter:${user}`;
}
