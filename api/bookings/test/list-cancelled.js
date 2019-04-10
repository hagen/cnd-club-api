/* global describe, it, */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../env/.env.test.prod') });
const mochaPlugin = require('serverless-mocha-plugin');
const should = require('should');
const TIMEOUT_MS = 9999999999;
const fnName = 'list-cancelled';
let wrapped = mochaPlugin.getWrapper(fnName, `/${fnName}.js`, 'run');
const moment = require('moment');
const CNDAPI = require('../../../lib/cnd');

describe(fnName, () => {
  
  let start = '2019-04-01';
  let end = '2019-04-07';
  let vehicle_id = parseInt(process.env.VEHICLE_ID, 10);
  let cndToken;
  let api;

  describe('# get session', () => {

    it(`should set up session`, async () => {
      cndToken = await CNDAPI.login({ 
        email: process.env.EMAIL, 
        password: process.env.PASSWORD
      });

      cndToken.should.be.a.String;
      should(cndToken).not.be.null;
      
      api = new CNDAPI(cndToken);
      api.should.be.an.Object;

    }).timeout(TIMEOUT_MS);
  })


  describe('# get cancelled bookings', () => {

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
      let cacheId = sha256(`cancelled:${urlPath}`);

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
          cndToken
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

    it(`should list only cancelled reservations`, async () => {

      // Add a fake entry to our cache. When that entry doesn't
      // come through from the list operation, it should come
      // back out to us as an inferred cancellation.
      let cancelledReservation = {
        id: 999999999,
        billing_distance: 110,
        billing_status: "billing_complete",
        borrower_review: {id: 118142, public_feedback: null, private_feedback: null, rating: true, reviewable_type: "Member"},
        end: "2019-03-31T15:00:00",
        member: {email: "damon.m.mc@gmail.com", mobile: "+61414605590", name: "Damon McIvor"},
        owner_booking: false,
        reviewable: true,
        start: "2019-03-30T14:30:00",
        status: "completed",
        total_owner_share: "$44.00",
        type: "reservation",
        vehicle_review: {id: 117482, public_feedback: "Great comfortable car", private_feedback: null, rating: true}
      }
      cache.response[cancelledReservation.id.toString()] = cancelledReservation;
      // Change the hash of this reservation and re-save
      cache = await ResponseCache.update(
        { id: cache.id },
        { response: cache.response },
        { returnValues: 'ALL_NEW' }
      );

      // Now that single record should come out
      let request = {
        auth: {
          cndToken
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
      response[0].id.should.equal(cancelledReservation.id);
    }).timeout(TIMEOUT_MS);
  });
})