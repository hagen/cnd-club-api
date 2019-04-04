const { unpackHttp, returnHttp } = require('../../lib/lambda-proxy');
const moment = require('moment');
const CNDAPI = require('../../lib/cnd');
const { ResponseCache } = require('../../models/ResponseCache');
const { fetchReservations } = require('./list')
const { arrayToKeyedObject, md5 } = require('../../lib/utils');

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
  const { vehicle_id } = params.pathParameters;
  const { start, end, type, status } = params.queryStringParameters;

  let api = new CNDAPI(cookie);
	let { reservations, urlPath } = await fetchReservations(api, vehicle_id, { start, end, type, status });  
	
	// Filter only records that have been updated. For this, we need the urlPath,
	// as that's our key into Dynamo.
	let cacheId = md5(`cancelled:${urlPath}`);
	let cachedResponse = await ResponseCache.get(cacheId);
	let cache = cachedResponse ? cachedResponse.response : {};

	// Key the reservations that just came in...
	let keyedReservations = arrayToKeyedObject(reservations, 'id');

	// Use the keys of what we have cached to ensure that what just came in
	// is also there...
	let cachedIds = Object.keys(cache);

	// Cancelled reservations are reservations where we have a key in cachedIds
	// but we don't have the corresponding key in keyedReservations (because
	// it has now been cancelled).
	let cancelledIds = cachedIds.filter(cachedId => !keyedReservations.hasOwnProperty(cachedId));

	// Now we will return the cached (cancelled reservations)
	let cachedReservations = Object.values(cache); // Convert the keyed reservation cache back to
																								 // an array.
	let cancelledReservations = cachedReservations
		.filter(reservation => cancelledIds.includes(reservation.id.toString()))
		.map(reservation => ({
			...reservation,
			status: 'cancelled'
		}));

	// Save/update the reservations that just came in to cache
	// so that we no longer attempt to trigger on the cancelled ones.
  setImmediate(async function() {
		// If we already have a cache response, then overwrite it.
		let cache = cachedResponse;
		if (cache) {
			cache.response = keyedReservations;
		} else {
			cache = new ResponseCache({
				id: cacheId,
				response: keyedReservations,
				createdAt: moment().unix()
			});
		}
    await cache.save();
	});
	
  return cancelledReservations;
}