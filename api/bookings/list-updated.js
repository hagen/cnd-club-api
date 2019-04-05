const { unpackHttp, returnHttp } = require('../../lib/lambda-proxy');
const moment = require('moment');
const CNDAPI = require('../../lib/cnd');
const { ResponseCache } = require('../../models/ResponseCache');
const { fetchReservations } = require('./list')
const { arrayToKeyedObject, sha256 } = require('../../lib/utils');

module.exports = {
  handle, run
};



async function handle(event, context, callback) {
  try {
    let body = await run(unpackHttp(event))
    return returnHttp({ statusCode: 200, body }, callback)
  } catch(e) {
		console.error(e)
    return returnHttp(e, callback)
  }
}





/**
 * Main function to run.
 * @param  {[type]} params [description]
 * @return {[type]}        [description]
 */
async function run(params) {
  const { cookie } = params.auth;
  const { vehicle_id, start, end, type, status } = params.queryStringParameters;

  let api = new CNDAPI(cookie);
	let { reservations, urlPath } = await fetchReservations(api, { vehicle_id, start, end, type, status });  
	
	// Filter only records that have been updated. For this, we need the urlPath,
	// as that's our key into Dynamo.
	let cacheId = sha256(`updated:${urlPath}`);
	let cachedResponse = await ResponseCache.get(cacheId);
	let cache = cachedResponse ? cachedResponse.response : {};

	// Compare the hashes...
	let changes = reservations.filter(reservation => {
		let cachedReservation = cache[reservation.id.toString()];
		// If we don't have this reservation in the cache, then it's new.
		// Do not send out new reservations - these will go out in the 'list' endpoint.
		if (!cachedReservation) {
			return false
		}
		// if the hash is different, send it out.
		return cachedReservation.start_end_hash !== reservation.start_end_hash;
	})
	

  // Save/update the reservations to cache.
  setImmediate(async function() {
		// Convert reservations so they're a keyed object
		let keyedReservations = arrayToKeyedObject(reservations, 'id');

		// If we already have a cache response, then overwrite it.
		let cache = cachedResponse;
		if (cache) {
			cache.response = keyedReservations;
		} else {
			cache = new ResponseCache({
				id: cacheId,
				urlPath,
				response: keyedReservations,
				createdAt: moment().unix()
			});
		}
    await cache.save();
	});
	
  return changes;
}