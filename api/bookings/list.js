const { unpackHttp, returnHttp } = require('../../lib/lambda-proxy');
const { HTTPError } = require('../../models/HTTPError');
const CNDAPI = require('../../lib/cnd');
const{ md5 } = require('../../lib/utils');
const moment = require('moment');
const validate = require('validate.js');
const validationRules = {
  vehicleId: {
    presence: {
      message: `must be supplied`
    },
    numericality: {
      noStrings: true,
      message: `must be a number`
    }
  },
  start: {
    presence: {
      message: `must be supplied`
    },
    format: {
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      message: `must match format YYYY-MM-DD`
    }
  },
  end: {
    presence: {
      message: `must be supplied`
    },
    format: {
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      message: `must match format YYYY-MM-DD`
    }
  },
  type: {
    presence: {
      message: `must be supplied`
    },
    inclusion: {
      within: ['reservation', 'schedule'],
      message: `^%{value} is an invalid type.`
    }
  },
  status: {
    inclusion: {
      within: ['completed', 'schedule', 'confirmed'],
      message: `^%{value} is an invalid status.`
    }
  }
};

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
  let { reservations } = await fetchReservations(api, vehicle_id, { start, end, type, status });  
  // At this point, are we returning everything? Or shall we do some filtering?
  return reservations;
}





/**
 * Returns all bookings for the car, between the start/end dates
 * @param {Cookie} cookie The Cookie
 * @param {Number} vehicleId Vehicle ID
 * @param {Object} queryParams Query string params to send (all required)
 * @param {Object} updatesOnly Only send records that have changed
 */
async function fetchReservations(api, vehicleId, { start, end, type, status }) {  
  // Vehicle ID must be a number
  // Start and End must match YYYY-MM-DD
  // Type must be in enum
  let validationResult = runValidation({ vehicleId, start, end, type, status });
  if (validationResult) {
    throw new HTTPError(400, {
      name: 'InvalidParameters',
      title: 'Invalid parameters',
      message: validationResult.join('; ')
    });
  }
  let urlPath = `/calendars/show?vehicle_id=${vehicleId}&start=${start}&end=${end}`;

  // Always filter by type, as type is always required
  let { json } = await api.getJSON(urlPath);
  let reservations = json
    .filter(item => item.type === type)
    .map(item => ({
      ...item,
      start_end_hash: md5(JSON.stringify({ 
        end: item.end, start: item.start
      }))
    }));
  
  // filtering by status?
  if (status) {
    reservations = reservations.filter(item => item.status === status);
  }

  // Finally, create a hash against date/time props of the reservation.
  return { 
    urlPath,
    reservations
  };
}
module.exports.fetchReservations = fetchReservations;




/**
 * Run validate.js rules, and custom rules. Returns first error/set of errors.
 * @param {Params} param All params to validate
 */
function runValidation({ vehicleId, start, end, type, status }) {
  let validateJsErrors = validate({ vehicleId, start, end, type, status }, validationRules, { format: 'flat' });
  if (validateJsErrors) {
    return validateJsErrors;
  }

  // Custom validation.
  if (moment(start).isAfter(moment(end))) {
    return ['Start must be before or equal to end'];
  }
  return null;
}