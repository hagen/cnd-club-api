/* global describe, before, it, after */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../env/.env.test.prod') });
const mochaPlugin = require('serverless-mocha-plugin');
const should = require('should');
const TIMEOUT_MS = 9999999999;
const fnName = 'authorizer';
let wrapped = mochaPlugin.getWrapper(fnName, `/${fnName}.js`, 'handle');
const shortid = require('shortid');
const moment = require('moment');
const AWS = require('aws-sdk');
const DynamoDB = new AWS.DynamoDB({
  region: process.env.REGION || 'ap-southeast-2'
});

describe(fnName, () => {

  let tableName;

  describe(`# create AWS resources`, () => {

    before(async () => {
      // Create DynamoDB table...
      let params = {
        AttributeDefinitions: [
          {
            AttributeName: 'id',
            AttributeType: 'S'
          }
        ],
        KeySchema: [
          {
            AttributeName: 'id',
            KeyType: 'HASH'
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1
        },
        TableName: shortid.generate()
      };
      let createTableResult = await DynamoDB.createTable(params).promise();
      tableName = createTableResult.TableDescription.TableName;
    });

    it('should wait until table is created', async () => {
      let params = {
        TableName: tableName
      }
      let waitResult = await DynamoDB.waitFor('tableExists', params).promise();
      waitResult.should.have.property('Table');
    }).timeout(99999999);
  });

  describe('# authorize session', () => {

    let session, expiredSession;
    process.env.DYNAMODB_TABLE_SESSION_COOKIE = tableName;    
    const { SessionCookie } = require('../../../models/SessionCookie');

    before(async () => {
      // Add session to dynamo
      session = new SessionCookie({
        id: 'testSessionKey',
        email: process.env.EMAIL,
        memberId: 123456,
        cookie: 'cookie=value',
        expires: moment().add(1, 'day',).unix()
      });
      await session.save();

      // Add session to dynamo
      expiredSession = new SessionCookie({
        id: 'expiredSession',
        email: process.env.EMAIL,
        memberId: 123456,
        cookie: 'cookie=value',
        expires: moment().subtract(1, 'day',).unix()
      });
      await expiredSession.save();
    });

    it(`should set up session`, async () => {
      session.should.have.property('id').equal(session.id);
      session.should.have.property('memberId');
      session.should.have.property('email');
      session.should.have.property('cookie');
      session.should.have.property('expires');
    }).timeout(TIMEOUT_MS);

    it(`should return a valid auth policy`, (done) => {
      let request = {
        authorizationToken: session.id
      };
      wrapped.run(request, null, function(err, policy) {
        should(err).be.null;
        policy.should.have.property('principalId').equal(session.memberId.toString());
        policy.should.have.property('context');
        policy.context.should.have.property('sessionId').equal(session.id);
        policy.context.should.have.property('memberId').equal(session.memberId.toString());
        policy.context.should.have.property('cookie').equal(session.cookie);
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

    it(`should throw Unauthorized for expired session`, (done) => {      
      
      let request = {
        authorizationToken: expiredSession.id
      };
      wrapped.run(request, null, function(err, policy) {
        should(policy).be.null;
        should(err).not.be.null;
        err.should.equal('Unauthorized');
        done();
      });
    }).timeout(TIMEOUT_MS);

    after(async () => {
      await DynamoDB.deleteTable({
        TableName: tableName
      }).promise();
    });
  })
})