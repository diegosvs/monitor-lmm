import url from 'url';
import querystring from 'querystring';

import graphApiRequest, { FACEBOOK_HOST } from './graphApiRequest';


export default function createAccessToken(appId, appSecret) {
  let promise = null;

  return {
    request: async() => {
      if (promise) {
        return await promise;
      }
      promise = requestNewAccessToken(appId, appSecret);
      return promise;
    },
    invalidate: () => {
      promise = null;
    }
  }
}

async function requestNewAccessToken(appId, appSecret) {
  const params = {
    client_id: appId,
    client_secret: appSecret,
    grant_type: 'client_credentials'
  };

  const endpoint = url.parse('https://' + FACEBOOK_HOST + '/oauth/access_token?' + querystring.encode(params));
  const responseString = await graphApiRequest(endpoint);

  const items = responseString.split('=');
  if (items.length === 2 && items[0] === 'access_token') {
    return items[1];
  }

  throw new Error(`failed getting access token from Facebook: received this instead of a token: \`${responseString}\``);
}