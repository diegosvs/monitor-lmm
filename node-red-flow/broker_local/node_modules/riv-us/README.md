# Rivus (https://riv.us)
Social aggregation into a single feed (example: [jaredwray.com](https://jaredwray.com/))

# Features
* Single Feed
* Built in Deduplication    
* Caching
* Data Store
* Callback and Promises Supported
* Many Providers

# Install

Requires Node.js v5.9.1 or higher.

**Using NPM**
```
$ npm install riv-us
```

# How To Use Rivus
**Step 1**: Set your the provider configuration file up correctly to support what providers you want to use and the settings / authentication needed.

* Medium: Copy user name from URL https://medium.com/@your_medium_username.
Put this in the field 'user' in the configuration. To get publication's feed copy the name of publication https ://medium.com/the-story and put it in the field "publication". If feed situated at the custom domain, copy only domain and put it in the field "publication_with_custom_domain".
* RSS: List the URL of the feed you are interested in the field "feed_url".
* Twitter: Create an application at https://apps.twitter.com/app/new. Go into the details of the generated application and find: Consumer Key (API Key), Consumer Secret (API Secret), Access Token, Access Token Secret. Copy these values and your account name @username in the appropriate configuration fields.
* Facebook: Create an application at https://developers.facebook.com/apps Go into the details of the generated application and find App ID and App Secret . Find out your User ID there are many ways to do it. Copy the received information in the appropriate configuration fields.
* Instagram: Copy the name of your account @username and your Access Token in the appropriate configuration fields.

```
{
    "dataStore": {
        "type": "none",
    },
    "providers": [
        {
            "name": "rss",
            "feed_url": "http://www.example.org/export/articles.rss"
        },
        {
            "name": "instagram",
            "user": "@username",
            "access_token": "1270826243.3574ed0.d2925718be41442e877c9d496b6e1d2a"
        },
        {
            "name": "medium",
            "user": "@username"
        },
        {
            "name": "medium",
            "publication": "blog_title"
        },
        {
            "name": "medium",
            "publication_with_custom_domain": "http://www.example.org"
        },
        {
            "name": "twitter",
            "user": "@username",
            "consumer_key": "dwO2Ye2v4hVVG9nPOuKVjKzDN",
            "consumer_secret": "wAbDbmxFKgBpdxiyzAIlSe5i8X3UyMP6N5OtBpCpVBEUrXQbw2",
            "access_token_key": "1234567892-q3ztVafxE9O9U0yWNkapcrAWJeuKW7Jw67Bu88k",
            "access_token_secret": "WQhEraiTcbJ4Nq2sqk5lnOWGdKBasOB5201smsoX17aSR"
        },
        {
            "name": "facebook",
            "app_id": "wAbDbmxFKgBpdxiyzAIlSe5i8X3UyMP6N5OtBpCpVBEUrXQbw2",
            "app_secret": "dwO2Ye2v4hVVG9nPOuKVjKzDN",
            "user_id": "userid"
        }
    ]
}
```

*dataStore* is optional. In case this section isn't specified will be used in-memory data store. 
As alternative you can set redis as a default data store:

```
"dataStore": {
  "type": "redis",
  "settings": {
    // here you can configure 'path', 'host', 'port' and 'password'
  }
}
```

**Step 2**: Do the following code to get the feed results:
```javascript
    var Rivus = require('riv-us');

    // the config should list the providers and their settings
    var rivus = new Rivus(__dirname + "../path/to/config"); 

    // or with an object
    var rivus = new Rivus({...});
    
    // load the data and store it in your data source (in-memory by default)
    rivus.synchronize().then(function() {
      // now you can get your feed
      rivus.getFeed().then(function(posts) {
        console.log('My Feed: ', posts);
      }, function(error) {
        console.error('Riv-us could not get posts: ', error);        
      });
      
      // configure synchronization with a periodic time interval
      setInterval(function() {
        console.log('starting scheduled synchronization...');
      
        rivus.synchronize().then(function() {
          console.log('scheduled synchronization completed');          
        }, function(error) {
          console.error('scheduled synchronization failed: ', error);
        })
      }, 1000 * 60 * 60 * 2 /* every 2 hours */);
      
    }, function(error) {
      console.error('Riv-us could not synchronize: ', error);
    });
```

By default the following is enabled:
* Deduplication is enabled by default.

**Environment variables**: Rivus can use environment variables. You have 2 options with env vars:

Use javascript object config:
```javascript
var rivus = new Rivus({
  dataStore: {
    type: "redis",
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
})
```

Use config file with variable interpolation:
```json
{
  "dataStore": {
    "type": "redis",
    "port": "${REDIS_PORT}"
  }
}
```

**Date display**: Moment.js allows you to easily manipulate created time.
```javascript
rivus.get(function (err, result) {
    result[0].created_time.format('dddd'); // Wednesday
});

```

**Filter Function**: provide a javascript filter function to filter incoming posts; posts which are filtered out will be completely missed and not appear in your data store.
```javascript
const rivus = new Rivus({
  dataStore: {
    // ...
  },
  providers: [
    // ...
  ]
});

rivus.filter.add(function(feedItem) {
  //do something in here where you can modify the feed item if you want

  //return if it should be included in the feed that is returned all rolled up
  return true || false;
});
```

# Standard Feed Result
The standard feed result will look like the following:
```javascript
{
  title: '',
  content: '',
  created_time: {}, // Moment object - http://momentjs.com/
  images: {
    thumbnail: {url: ''},
    content: {url: ''} // optional
  },
  link: "",
  extra: {}, // original feed
  source: {
    name: '', // provider name
    feed: '' // feed id
  }
}
```

# Providers
Providers are built with a set of common interfaces so that they can be interchangable. Each provider allows for the following:
* ID: is required for every provider and it cannot be the same as another. This is done as a constant such as ```id = 'providerID'```
* configuration / settings at the creation of the service ```var obj = new Provider(config);``` : each config can be located in the ```/config.json``` configuration file under the ```providers:``` array.
* get(): get feed items ```get(count)```: This allows to get the feed items in a normalized look and feel.

Here is a list of providers currently supported:

* Instagram
* Twitter
* RSS
* Medium
* Facebook

# Tests
Tests for Rivus can be run using the command:
```
npm test
```

# Authors
Jared Wray [jaredwray.com](http://jaredwray.com)

# Licence
Apache 2.0

# Issues
Issues? Feature Requests? reported an [issue](https://github.com/jaredwray/rivus/issues).
