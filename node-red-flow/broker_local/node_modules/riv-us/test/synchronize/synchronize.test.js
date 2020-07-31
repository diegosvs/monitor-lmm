import chai from 'chai';
const expect = chai.expect;
chai.should();

import moment from 'moment';

import synchronize from '../../src/services/synchronize';
import createMemoryDataStore from '../../src/dataStore/memory/createMemoryDataStore';
import ProviderMock from '../common/provider.mock';
import FeedMock from '../common/feed.mock';
import { demomentize } from '../../src/services/momentize';


describe('synchronization', function() {
  describe('with a single provider', function() {
    beforeEach(function() {
      this.firstProvider = firstProvider();
      this.feed = new FeedMock('f', [this.firstProvider]);
      this.dataStore = createMemoryDataStore();
    });

    afterEach(async function() {
      await this.dataStore.drop();
    });

    it('works properly on initial run', async function() {
      await synchronize(this.feed, this.dataStore);
      await verifyStore(this.feed, this.dataStore);
    });
  });

  describe('with two providers', function() {
    beforeEach(function() {
      this.firstProvider = firstProvider();
      this.secondProvider = secondProvider();
      this.feed = new FeedMock('f', [this.firstProvider, this.secondProvider]);
      this.dataStore = createMemoryDataStore();
    });

    afterEach(async function() {
      await this.dataStore.drop();
    });

    it('works properly on initial run', async function() {
      await synchronize(this.feed, this.dataStore);
      await verifyStore(this.feed, this.dataStore);
    });
  });
});

async function verifyStore(feed, store) {
  const storePosts = (await store.getFeedPosts(feed, 0, Number.MAX_VALUE)).map(demomentize);
  const mockPosts = (await feed.fetchPosts(Number.MAX_VALUE)).map(demomentize);
  expect(mockPosts).to.deep.equal(storePosts, 'expected posts are not in data store');
}

function firstProvider() {
  return new ProviderMock('p1', [{
    id: 'p1-1',
    created_time: moment(0),
    source: { name: 'p1' }
  }, {
    id: 'p1-2',
    created_time: moment(10000),
    source: { name: 'p1' }
  }, {
    id: 'p1-3',
    created_time: moment(100000),
    source: { name: 'p1' }
  }]);
}

function secondProvider() {
  return new ProviderMock('p2', [{
    id: 'p2-1',
    created_time: moment(5000),
    source: { name: 'p2' }
  }, {
    id: 'p2-2',
    created_time: moment(50000),
    source: { name: 'p2' }
  }, {
    id: 'p2-3',
    created_time: moment(500000),
    source: { name: 'p2' }
  }]);
}