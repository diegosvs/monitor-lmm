'use strict';

import querystring from 'querystring';
import moment from 'moment';
import url from 'url';

import createAccessToken from './accessToken';
import graphApiRequest, { FACEBOOK_HOST } from './graphApiRequest';


export default function createFacebookProvider(config) {
  const userId = config.mandatory('user_id');
  const feedId = `facebook:user:${userId}`;
  const accessToken = createAccessToken(config.mandatory('app_id'), config.mandatory('app_secret'));

  const provider = {
    fetchPosts: async(limit = 10, pageToken = null) => {
      let posts = [];
      let nextPageToken = pageToken;

      while (posts.length < limit) {
        const response = await fetchPosts(feedId, userId, accessToken, nextPageToken);
        posts = posts.concat(response.posts);
        nextPageToken = posts.nextPageToken;
      }

      return {
        posts,
        nextPageToken
      };
    }
  };
  Object.defineProperty(provider, 'feedId', { get: () => feedId });
  return provider;
}

async function fetchPosts(feedId, userId, accessToken, nextPageToken) {
  let endpoint;

  if (nextPageToken) {
    endpoint = url.parse(nextPageToken);
  } else {
    const params = {
      fields: 'message,link,message_tags,name,picture,full_picture,type,created_time,source,story_tags'
    };
    endpoint = url.parse('https://' + FACEBOOK_HOST + '/' + userId + '/feed?' + querystring.encode(params));
  }

  const response = await graphApiRequest(endpoint, await accessToken.request());

  return {
    posts: response.data.map(p => cookFeedItem(p, feedId)),
    nextPageToken: (response.paging || {}).next
  };
}

function cookFeedItem(feedId, post) {
  const parseImages = () => {
    const images = {};

    if (post.picture && post.picture.length) {
      images.thumbnail = { url: post.picture };
    }

    if (post.full_picture && post.full_picture.length) {
      images.content = { url: post.full_picture };
    }

    return images;
  };

  return {
    id: `fb:${post.id}`,
    title: post.name,
    content: post.message,
    created_time: moment(new Date(post.created_time).getTime()),
    images: parseImages(),
    link: post.link,
    extra: {
      original: post
    },
    source: {
      name: 'facebook',
      feed: feedId
    }
  };
}
