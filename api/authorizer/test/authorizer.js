/* global describe, it */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../env/.env.test.prod') });
const mochaPlugin = require('serverless-mocha-plugin');
const should = require('should');
const TIMEOUT_MS = 9999999999;
const fnName = 'authorizer';
let wrapped = mochaPlugin.getWrapper(fnName, `/${fnName}.js`, 'handle');
const CNDAPI = require('../../../lib/cnd');

describe(fnName, () => {

  let cndToken;

  describe('# get session', () => {

    it(`should set up session`, async () => {
      cndToken = await CNDAPI.login({ 
        email: process.env.EMAIL, 
        password: process.env.PASSWORD
      });

      cndToken.should.be.a.String;
      should(cndToken).not.be.null;
    }).timeout(TIMEOUT_MS);

    it(`should return a valid auth policy`, (done) => {
      let request = {
        authorizationToken: cndToken
      };
      wrapped.run(request, null, function(err, policy) {
        should(err).be.null;
        policy.should.have.property('principalId').equal(cndToken);
        policy.should.have.property('context');
        policy.context.should.have.property('cndToken').equal(cndToken);
        done();
      });
    }).timeout(TIMEOUT_MS);

    it(`should throw Unauthorized for missing authorization token`, (done) => {      
      let request = {
        authorizationToken: null
      };
      wrapped.run(request, null, function(err, policy) {
        should(policy).be.null;
        should(err).not.be.null;
        err.should.equal('Unauthorized');
        done();
      });
    }).timeout(TIMEOUT_MS);
  })
})