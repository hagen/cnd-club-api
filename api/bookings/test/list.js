/* global describe, before, it */
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
  let start = '2019-04-01';
  let end = '2019-04-07';
  let vehicle_id = parseInt(process.env.VEHICLE_ID, 10);

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


  describe('# get bookings', () => {

    it(`should list reservations for vehicle and date range`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
          vehicle_id
        },
        queryStringParameters: {
          start,
          end,
          type: 'reservation'
        }
      }
      let response = await wrapped.run(request);
      response.should.be.an.Array;
      response.length.should.be.above(1);
    }).timeout(TIMEOUT_MS);
  });  

  describe('# get blockouts', () => {

    it(`should list blockouts for vehicle and date range`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
          vehicle_id
        },
        queryStringParameters: {
          start,
          end,
          type: 'schedule'
        }
      }
      let response = await wrapped.run(request);
      response.should.be.an.Array;
      response.length.should.be.above(0);
    }).timeout(TIMEOUT_MS);
  });  

  describe('# errors', () => {

    it(`should complain that 'vehicle_id' is missing`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
          // vehicle_id: process.env.VEHICLE_ID
        },
        queryStringParameters: {
          start,
          end,
          type: 'schedule'
        }
      }
      await wrapped.run(request).should.be.rejectedWith({
        statusCode: 400,        
        name: 'InvalidParameters',
        title: 'Invalid parameters',
        message: 'Vehicle id must be supplied'
      });
    }).timeout(TIMEOUT_MS);

    it(`should complain that 'start' is missing`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
          vehicle_id
        },
        queryStringParameters: {
          // start,
          end,
          type: 'schedule'
        }
      }
      await wrapped.run(request).should.be.rejectedWith({
        statusCode: 400,        
        name: 'InvalidParameters',
        title: 'Invalid parameters',
        message: 'Start must be supplied'
      });
    }).timeout(TIMEOUT_MS);

    it(`should complain that 'end' is missing`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
          vehicle_id
        },
        queryStringParameters: {
          start,
          // end,
          type: 'schedule'
        }
      }
      await wrapped.run(request).should.be.rejectedWith({
        statusCode: 400,        
        name: 'InvalidParameters',
        title: 'Invalid parameters',
        message: 'End must be supplied'
      });
    }).timeout(TIMEOUT_MS);

    it(`should complain that 'type' is missing`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
          vehicle_id
        },
        queryStringParameters: {
          start,
          end,
          // type: 'schedule'
        }
      }
      await wrapped.run(request).should.be.rejectedWith({
        statusCode: 400,        
        name: 'InvalidParameters',
        title: 'Invalid parameters',
        message: 'Type must be supplied'
      });
    }).timeout(TIMEOUT_MS);

    it(`should complain that 'start' and 'end' are missing`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
          vehicle_id
        },
        queryStringParameters: {
          // start,
          // end,
          type: 'schedule'
        }
      }
      await wrapped.run(request).should.be.rejectedWith({
        statusCode: 400,        
        name: 'InvalidParameters',
        title: 'Invalid parameters',
        message: 'Start must be supplied; End must be supplied'
      });
    }).timeout(TIMEOUT_MS);

    it(`should complain that 'start' must be before or equal to 'end'`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
          vehicle_id
        },
        queryStringParameters: {
          start: end,
          end: start,
          type: 'schedule'
        }
      }
      await wrapped.run(request).should.be.rejectedWith({
        statusCode: 400,        
        name: 'InvalidParameters',
        title: 'Invalid parameters',
        message: 'Start must be before or equal to end'
      });
    }).timeout(TIMEOUT_MS);
  });
})