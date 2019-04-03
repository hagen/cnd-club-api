/* global describe, before, it, after */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../env/.env.test.prod') });
const mochaPlugin = require('serverless-mocha-plugin');
require('should');
const TIMEOUT_MS = 9999999999;
const fnName = 'get';
let wrapped = mochaPlugin.getWrapper(fnName, `/${fnName}.js`, 'run');
const shortid = require('shortid');
const moment = require('moment');
const AWS = require('aws-sdk');
const DynamoDB = new AWS.DynamoDB({
  region: process.env.REGION || 'ap-southeast-2'
});
const api = require('../../../lib/cnd');

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

  describe('# get session', () => {

    let session;
    let sessionId = 'testSessionKey';
    process.env.DYNAMODB_TABLE_SESSION_COOKIE = tableName;    
    const { SessionCookie } = require('../../../models/SessionCookie');

    before(async () => {
    });

    it(`should set up session`, async () => {
      let { cookie, memberId, expires } = await api.logIn({ 
        email: process.env.EMAIL, 
        password: process.env.PASSWORD
      });

      // Add session to dynamo
      session = new SessionCookie({
        id: sessionId,
        email: process.env.EMAIL,
        memberId: memberId,
        cookie: cookie,
        expires: moment(expires).unix()
      });
      await session.save();

      session.should.have.property('id').equal(sessionId);
      session.should.have.property('memberId');
      session.should.have.property('email');
      session.should.have.property('cookie');
      session.should.have.property('expires');
    }).timeout(TIMEOUT_MS);

    it(`should get session`, async () => {
      let request = {
        auth: {
          sessionId: session.id,
          cookie: session.cookie,
          memberId: session.memberId
        },
        body: {}
      };
      let response = await wrapped.run(request)
      response.should.have.property('id');
      response.id.should.equal(session.id);
      response.memberId.should.equal(session.memberId);
    }).timeout(TIMEOUT_MS);

    it(`should return 403 for expired/invalid cookie`, async () => {
      let request = {
        auth: {
          sessionId,
          cookie: 'invalid=cookie'
        },
        body: {}
      };
      await wrapped.run(request).should.be.rejectedWith({
        statusCode: 401,
        name: 'Unauthorized',
        title: 'Unauthorized'
      });
    }).timeout(TIMEOUT_MS);

    after(async () => {
      await DynamoDB.deleteTable({
        TableName: tableName
      }).promise();
    });
  })
})