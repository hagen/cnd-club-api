const { unpackHttp, returnHttp } = require('../../lib/lambda-proxy');
const { HTTPError } = require('../../models/HTTPError');
const { getJSON } = require('../../lib/cnd');
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

  let reservations = await fetchReservations(cookie, vehicle_id, { start, end, type, status });
  
  // At this point, are we returning everything? Or shall we do some filtering?
  return reservations;
}


/**
 * Returns all bookings for the car, between the start/end dates
 * @param {Cookie} cookie The Cookie
 * @param {Number} vehicleId Vehicle ID
 * @param {Object} queryParams Query string params to send (all required)
 */
async function fetchReservations(cookie, vehicleId, { start, end, type, status }) {  
  // Vehicle ID must be a number
  // Start and End must match YYYY-MM-DD
  // Type must be in enum
  let validationResult = validate({ vehicleId, start, end, type, status }, validationRules, { format: 'flat' });
  if (validationResult) {
    throw new HTTPError(400, {
      name: 'InvalidParameters',
      title: 'Invalid parameters',
      message: validationResult.join('; ')
    })
  }
  let urlPath = `/calendars/show?vehicle_id=${vehicleId}&start=${start}&end=${end}`;

  // Always filter by type, as type is always required
  let items = (await getJSON(cookie, urlPath)).filter(item => item.type === type);
  
  // filtering by status?
  if (status) {
    items = items.filter(item => item.status === status);
  }
  return items;
}