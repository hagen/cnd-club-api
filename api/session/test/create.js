/* global describe, before, it, after */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../env/.env.test.prod') });
const mochaPlugin = require('serverless-mocha-plugin');
require('should');
const TIMEOUT_MS = 10 * 1000;
const fnName = 'create';
let wrapped = mochaPlugin.getWrapper(fnName, `/${fnName}.js`, 'run');
const shortid = require('shortid');
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const AWS = require('aws-sdk');
const DynamoDB = new AWS.DynamoDB({
  region: process.env.REGION || 'ap-southeast-2'
});
const { SessionCookie } = require('../../../models/SessionCookie');

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

  describe('# create session', () => {

    let id;

    before(async () => {

    });

    it(`should generate auth cookie`, async () => {
      process.env.DYNAMODB_TABLE_SESSION_COOKIE = tableName;
      let request = {
        body: {
          email: EMAIL,
          password: PASSWORD
        }
      };
      let response = await wrapped.run(request)
      response.should.have.property('id');
      response.should.have.property('memberId');
      response.should.have.property('email');
      id = response.id;
    }).timeout(TIMEOUT_MS);

    it(`should save auth cookie to dynamo`, async () => {
      process.env.DYNAMODB_TABLE_SESSION_COOKIE = tableName;
      let session = await SessionCookie.get(id);
      session.should.have.property('id').equal(id);
      session.should.have.property('memberId');
      session.should.have.property('email');
      session.should.have.property('cookie');
      session.should.have.property('expires');
    }).timeout(TIMEOUT_MS);

    after(async () => {
      await DynamoDB.deleteTable({
        TableName: tableName
      }).promise();
    });
  })
})