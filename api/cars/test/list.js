/* global describe, before, it, after, afterAll */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../env/.env.test.prod') });
const mochaPlugin = require('serverless-mocha-plugin');
require('should');
const TIMEOUT_MS = 9999999999;
const fnName = 'list';
let wrapped = mochaPlugin.getWrapper(fnName, `/${fnName}.js`, 'run');
const moment = require('moment');
const CNDAPI = require('../../../lib/cnd');

describe(fnName, () => {
  
  let session;

  describe('# get session', () => {

    it(`should set up session`, async () => {
      let { cookie, memberId, expires } = await CNDAPI.logIn({ 
        email: process.env.EMAIL, 
        password: process.env.PASSWORD
      });

      // Add session to dynamo
      session = {
        email: process.env.EMAIL,
        memberId: memberId,
        cookie: cookie,
        expires: moment(expires).unix()
      };
      session.should.have.property('memberId');
      session.should.have.property('email');
      session.should.have.property('cookie');
      session.should.have.property('expires');
    }).timeout(TIMEOUT_MS);
  })


  describe('# get cars', () => {

    it(`should list member's cars`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {},
        queryStringParameters: {}
      }
      let response = await wrapped.run(request);
      response.should.be.an.Array;
      response.length.should.be.above(0 );
    }).timeout(TIMEOUT_MS);
  });
})