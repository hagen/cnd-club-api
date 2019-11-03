const {unpackHttp, returnHttp} = require('../../lib/lambda-proxy');
const {HTTPError} = require('../../models/HTTPError');
const CNDAPI = require('../../lib/cnd');
const {md5} = require('../../lib/utils');
const moment = require('moment');
const validate = require('validate.js');
const validationRules = {
  vehicle_id: {
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
  }
};

module.exports = {
  handle,
  run
};

async function handle(event, context, callback) {
  try {
    let body = await run(unpackHttp(event));
    return returnHttp({statusCode: 200, body}, callback);
  } catch (e) {
    console.error(e);
    return returnHttp(e, callback);
  }
}

/**
 * Main function to run.
 * @param  {[type]} params [description]
 * @return {[type]}        [description]
 */
async function run(params) {
  const {cndToken} = params.auth;
  const {vehicle_id, start, end, type} = params.queryStringParameters;

  let api = new CNDAPI(cndToken);
  let {reservations} = await fetchReservations(api, {
    vehicle_id,
    start,
    end,
    type
  });
  return reservations;
}

/**
 * Returns all bookings for the car, between the start/end dates
 * @param {CNDAPI} api The CND API
 * @param {Object} queryParams Query string params to send (all required)
 */
async function fetchReservations(api, {vehicle_id, start, end, type}) {
  // Vehicle ID must be a number
  // Start and End must match YYYY-MM-DD
  // Type must be in enum
  let validationResult = runValidation({vehicle_id, start, end, type});
  if (validationResult) {
    throw new HTTPError(400, {
      name: 'InvalidParameters',
      title: 'Invalid parameters',
      message: validationResult.join('; ')
    });
  }
  let urlPath = `/cars/${vehicle_id}/calendar_events?vlocal_start_at=${start}&vlocal_end_at=${end}`;

  // Always filter by type, as type is always required
  let {calendar_events} = await api.get(urlPath);
  let reservations = calendar_events
    .filter(item => item.type === type)
    // Finally, create a hash against date/time props of the reservation.
    .map(item => ({
      id: item.reservation ? item.reservation.id : item.schedule.id,
      ...item,
      start_end_hash: md5(
        JSON.stringify({
          end_at: item.end_at,
          start_at: item.start_at
        })
      )
    }));

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
function runValidation({vehicle_id, start, end, type, status}) {
  let validateJsErrors = validate(
    {vehicle_id, start, end, type, status},
    validationRules,
    {format: 'flat'}
  );
  if (validateJsErrors) {
    return validateJsErrors;
  }

  // Custom validation.
  if (moment(start).isAfter(moment(end))) {
    return ['Start must be before or equal to end'];
  }
  return null;
}
