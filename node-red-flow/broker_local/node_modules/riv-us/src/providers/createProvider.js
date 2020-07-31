import createFacebookProvider from './facebook/facebook';
import createTwitterProvider from './twitter/twitter';
import createRssProvider from './rss/rss';
import createMediumProvider from './medium/medium';
import createInstagramProvider from './instagram/instagram';


export default function createProvider(config) {
  const name = config.mandatory('name');
  switch (name) {
    case 'facebook':
      return createFacebookProvider(config);
    case 'medium':
      return createMediumProvider(config);
    case 'twitter':
      return createTwitterProvider(config);
    case 'rss':
      return createRssProvider(config);
    case 'instagram':
      return createInstagramProvider(config);
    default:
      throw new Error(`unknown provider type \`${name}\``);
  }
}
