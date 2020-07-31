import path from 'path';

import chai from 'chai';
const expect = chai.expect;
chai.should();
import Config from '../../src/config';


describe('Config', function() {
  it('accepts object as an initializer', async function() {
    const config = await new Config({ one: 'two' }).load();

    config.should.be.an('object');
    config.constructor.name.should.eql('ResolvedConfig');
    config.optional('one', 'one').should.eql('two');
  });

  it('accepts file name as an initializer', async function() {
    const configFile = path.join(__dirname, 'config.json');
    const config = await new Config(configFile).load();

    config.should.be.an('object');
    config.constructor.name.should.eql('ResolvedConfig');
    config.optional('one', 'one').should.eql('one-one-one');
  });

  it('has a method to get optional value with a default', async function() {
    const config = await new Config({ one: 'two' }).load();
    config.optional('missing', 'xxx').should.eql('xxx');
  });

  it('has a method to throw an exception if mandatory value is missing', async function() {
    const config = await new Config({ one: 'two' }).load();

    config.mandatory.bind(config, 'missing').should.throw(Error);
  });

  it('has a method to obtain a config section', async function() {
    const config = await new Config({
      one: 'two',
      mySection: {
        two: 'three'
      },
      nullSection: null
    }).load();

    const emptySection = config.section('missing');
    emptySection.should.be.an('object');
    emptySection.attributes.should.be.empty;

    const optionalEmptySection = config.section('missing', { optional: true });
    expect(optionalEmptySection).to.be.null;

    const section = config.section('mySection');
    section.should.be.an('object');
    section.optional('two').should.eql('three');

    const nullSection = config.section('nullSection', { optional: true });
    expect(nullSection).to.be.null;
  });

  describe('interpolation', function() {
    beforeEach(() => {
      process.env.HELLO = 'World!';
      process.env.HELLO_REFERENCED = '${HELLO}';
      process.env.SECTION = '{"someValue": 100500}';
      process.env.SECTION_2 = '{"someValue": {"otherValue": 100500}}';
      process.env.ARRAY_SECTION = '{"arrayValue": [{"someValue": 10}]}';
    });

    afterEach(() => {
      delete process.env.HELLO;
      delete process.env.HELLO_REFERENCED;
      delete process.env.SECTION;
      delete process.env.SECTION_2;
      delete process.env.ARRAY_SECTION;
    });

    it('expands expressions with environment variables', async function() {
      const config = await new Config({
        one: '${HELLO}'
      }).load();
      config.mandatory('one').should.eql('World!');
    });

    it('expands expressions', async function() {
      const config = await new Config({
        one: '${HELLO_REFERENCED}'
      }).load();
      config.mandatory('one').should.eql('World!');
    });

    it('expands longer expressions', async function() {
      const config = await new Config({
        one: '${SECTION_2.someValue.otherValue}'
      }).load();
      config.mandatory('one').should.eql(100500);
    });

    it('ignores unset variables for optional cases', async function() {
      delete process.env.HELLO;

      const config = await new Config({
        one: '${HELLO_REFERENCED}'
      }).load();

      config.optional('one', 'two').should.eql('two');
    });

    it('interpolates expressions with sections JSON', async function() {
      const config = await new Config({
        one: '${SECTION}'
      }).load();
      config.section('one').mandatory('someValue').should.eql(100500);
    });

    it('ignores unset variables for optional sections', async function() {
      const config = await new Config({
        one: '${SECTIONX}'
      }).load();

      expect(config.section('one', { optional: true })).to.be.null;
    });

    it('resolves arrays with a single elements', async function() {
      const config = await new Config({
        v: '${ARRAY_SECTION.arrayValue.someValue}'
      }).load();

      config.mandatory('v').should.eql(10);
    });
  });
});
