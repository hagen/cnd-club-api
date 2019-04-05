/* global describe, it, */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../env/.env.test.prod') });
const mochaPlugin = require('serverless-mocha-plugin');
require('should');
const TIMEOUT_MS = 9999999999;
const fnName = 'list-updated';
let wrapped = mochaPlugin.getWrapper(fnName, `/${fnName}.js`, 'run');
const moment = require('moment');
const CNDAPI = require('../../../lib/cnd');

describe(fnName, () => {
  
  let start = '2019-04-01';
  let end = '2019-04-07';
  let vehicle_id = parseInt(process.env.VEHICLE_ID, 10);
  let session;
  let api;

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
      
      api = new CNDAPI(session.cookie);
      api.should.be.an.Object;

    }).timeout(TIMEOUT_MS);
  })


  describe('# get updated bookings', () => {

    const { fetchReservations } = require('../list');
    const { arrayToKeyedObject, sha256 } = require('../../../lib/utils');
    const { ResponseCache } = require('../../../models/ResponseCache');   
    let cache;

    it(`should save initial fetch list to cache`, async () => {   
      // Fetch reservations and save them to response cache.
      let { reservations, urlPath } = await fetchReservations(api, {
        vehicle_id,
        start,
        end,
        type: 'reservation'
      });
      let cacheId = sha256(`updated:${urlPath}`);

      // Transform to keyed and save to ResponseCache
      cache = new ResponseCache({
        id: cacheId,
        urlPath,
        response: arrayToKeyedObject(reservations, 'id'),
        createdAt: moment().unix()
      });
      await cache.save();

      // try and read it again... some wierd stuff is happening...
      cache = null;
      cache = await ResponseCache.get(cacheId);
      cache.should.have.property('id').equal(cacheId);
    }).timeout(TIMEOUT_MS);

    it(`should not list new reservations`, async () => {
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
        },
        queryStringParameters: {
          vehicle_id,
          start,
          end,
          type: 'reservation'
        }
      }
      let response = await wrapped.run(request);
      response.should.be.an.Array;
      response.length.should.equal(0);
    }).timeout(TIMEOUT_MS);

    it(`should list only updated reservations`, async () => {
      // Get the cache, then change the hash of one entry.
      // That entry should then be spat out
      let id = Object.keys(cache.response)[0];
      // Change the hash of this reservation and re-save
      cache.response[id].start_end_hash = 'changed';
      cache = await ResponseCache.update(
        { id: cache.id },
        { response: cache.response },
        { returnValues: 'ALL_NEW' }
      );

      // Now that single record should come out
      let request = {
        auth: {
          ...session
        },
        pathParameters: {
        },
        queryStringParameters: {
          vehicle_id,
          start,
          end,
          type: 'reservation'
        }
      }
      let response = await wrapped.run(request);
      response.should.be.an.Array;
      response.length.should.equal(1);
      response[0].id.should.equal(parseInt(id, 10));
    }).timeout(TIMEOUT_MS);
  });
})