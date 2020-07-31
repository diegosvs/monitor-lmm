import https from 'https';
import querystring from 'querystring';
import moment from 'moment';

const API_BASE_URL = 'https://api.instagram.com/v1/users/self/media/recent/';


export default function createInstagramProvider(config) {
  const user = config.optional('user', 'own');
  const accessToken = config.mandatory('access_token');
  const feedId = feedIdForUser(user, accessToken);

  const provider = {
    fetchPosts: async(limit = 10, pageToken = null) => {
      const params = { access_token: accessToken };
      if (pageToken) {
        params.next_max_id = pageToken;
      }

      const url = API_BASE_URL + '?' + querystring.stringify(params);

      const response = await new Promise((resolve, reject) => {
        const request = https.get(url, message => {
          let body = '';
          message.on('data', responseData => body += responseData.toString('utf8'));
          message.on('end', () => resolve(JSON.parse(body)));
        });

        request.on('error', error => reject(
          new Error(`Failed calling Instagram: ${error.message}`)
        ));
      });

      if (!response.meta) {
        throw new Error(`Failed calling Instagram: invalid response: \`${JSON.stringify(response)}\``);
      }

      if (response.meta.code !== 200) {
        throw new Error(`Failed calling Instagram: failing response: \`${JSON.stringify(response)}\``);
      }

      return {
        posts: response.data ? response.data.map(p => cookFeedItem(feedId, p)) : [],
        nextPageToken: response.pagination ? response.pagination.next_max_id : null
      };
    }
  };
  Object.defineProperty(provider, 'feedId', {
    get: () => feedId
  });
  return provider;
}

function cookFeedItem(feedId, original) {
  return {
    id: 'inst:' + original.id,
    title: original.caption && original.caption.text.substring(0, 20),
    content: original.caption && original.caption.text,
    created_time: moment(new Date(original.created_time * 1000).getTime()),
    images: {
      thumbnail: {
        url: original.images.thumbnail.url
      },
      content: {
        url: original.images.standard_resolution.url
      }
    },
    link: original.link,
    extra: { original },
    source: {
      name: 'instagram',
      feed: feedId
    }
  };
}

function feedIdForUser(user, accessToken) {
  if (user === 'own') {
    return `instagram:own:${accessToken}`;
  } else {
    return `instagram:user:${user}`;
  }
}
