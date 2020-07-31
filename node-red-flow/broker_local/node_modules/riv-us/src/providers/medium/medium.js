import url from 'url';
import createRssProvider from '../rss/rss';


export default function createMediumProvider(config) {
  return createRssProvider(null, createRssConfig(config));
}

function createRssConfig(mediumConfig) {
  if (mediumConfig.optional('user')) {
    return {
      feedUrl: 'https://medium.com/feed/' + mediumConfig.optional('user'),
      feedId: feedId('user', mediumConfig.optional('user')),
      providerName: 'medium'
    };
  } else if (mediumConfig.optional('publication')) {
    return {
      feedUrl: 'https://medium.com/feed/' + mediumConfig.optional('publication'),
      feedId: feedId('publication', mediumConfig.optional('publication')),
      providerName: 'medium'
    };
  } else if (mediumConfig.optional('publication_with_custom_domain')) {
    const customDomainUrl = url.parse(mediumConfig.optional('publication_with_custom_domain'));
    customDomainUrl.pathname = '/feed';

    return {
      feedUrl: customDomainUrl.format(),
      feedId: feedId('publication_with_custom_domain', mediumConfig.optional('publication_with_custom_domain')),
      providerName: 'medium'
    };
  }
  throw new Error('medium provider: config is invalid');
}

function feedId(type, id) {
  return `medium:${type}:${id}`;
}
