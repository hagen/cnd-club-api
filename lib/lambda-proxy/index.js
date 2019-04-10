const { isLambda } = require('../utils')
if (isLambda()) {
	require('babel-polyfill');
}

/**
 * Parse a typed value from a string
 * @param {String} val Inbound value to parse
 */
const coerceValue = val => {
  if (val.trim() === 'true') {
    // Bool true
    return true;
  } else if (val.trim() === 'false') {
    // Bool false
    return false;
  } else if (/^[0-9]+$/.test(val)) {
    // Int
    return parseInt(val, 10);
  }
  return val;
}


module.exports.unpackHttp = function unpackHttp(event){

  let auth = event.requestContext.authorizer;
  
  // Prep path parameters
  const pathParameters = Object.keys(event.pathParameters || {}).reduce((obj, key) => {
    obj[key] = coerceValue(event.pathParameters[key]);
    return obj
  }, {});

  // And query strings
  let queryStringParameters = Object.keys(event.queryStringParameters || {}).reduce((obj, key) => {
    obj[key] = coerceValue(event.queryStringParameters[key]);
    return obj
  }, {});

  // And multi value query strings. Note that all query string values
  // are included here too, so be careful. You will overwrite normal
  // params with arrays.
  // We address this by only looking at params that match this pattern: key[]
  // Otherwise, ignore it.
  queryStringParameters = Object.keys(event.multiValueQueryStringParameters || {}).reduce((obj, bracketedKey) => {
    if (!bracketedKey.includes('[]')) {
      return obj;
    }
    
    // Our new key name removes the brackets []
    let keyName = bracketedKey.replace('[]', '');
    
    // It's okay to overwrite what ever is in query string params, as that
    // always holds the last/most recent value.
    // Try to turn the list of values into their true types.    
    // Assign to the bracketless key name
    obj[keyName] = event.multiValueQueryStringParameters[bracketedKey].map(coerceValue);

    // Delete the bracketed version from obj, if present...
    if (obj.hasOwnProperty(bracketedKey)) {
      delete obj[bracketedKey];
    }

    return obj
  }, queryStringParameters);

  const params = {
    path: event.path,
    method: (event.method || event.httpMethod).toLowerCase(),
    pathParameters,
    queryStringParameters,
    body: event.body ? typeof event.body === 'string' ? JSON.parse(event.body) : event.body : {}
  };
  if (auth) {
    params.auth = auth;
  }

  return params;
}
module.exports.unpackSns = function unpackSns(event) {
  return {
    topicArn: event.Records[0].Sns.TopicArn,
    message: typeof event.Records[0].Sns.Message === 'string'
              ? JSON.parse(event.Records[0].Sns.Message)
              : event.Records[0].Sns.Message
  }
}
module.exports.unpackCron = event => event;
module.exports.unpackCronInput = event => event;
module.exports.isSnsEvent = event => event.hasOwnProperty('Records') && event.Records.constructor === Array;
module.exports.isCronEvent = event => event.hasOwnProperty('source') && event['source'] === 'aws.events';


const Status = require('http-status-codes')
const BASE = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
    "Content-Type": "application/json"
  }
}
function response(statusCode, json) {
  let resp = {
    ...BASE,
    statusCode,
  }
  if (json) {
    resp.body = JSON.stringify(json)
  }
  return resp
}
const http = {
  _200: (json, cb) => cb(null, response(Status.OK, json)),
  _201: (json, cb) => cb(null, response(Status.CREATED, json)),
  _202: (json, cb) => cb(null, response(Status.ACCEPTED, json)),
  _204: (json, cb) => cb(null, response(Status.NO_CONTENT)),

  _400: (json, cb) => cb(null, response(Status.BAD_REQUEST, json)),
  _401: (json, cb) => cb(null, response(Status.UNAUTHORIZED, json)),
  _403: (json, cb) => cb(null, response(Status.FORBIDDEN, json)),
  _404: (json, cb) => cb(null, response(Status.NOT_FOUND, json)),
  _406: (json, cb) => cb(null, response(Status.NOT_ACCEPTABLE, json)),
  _412: (json, cb) => cb(null, response(Status.PRECONDITION_FAILED, json)),
  _422: (json, cb) => cb(null, response(Status.UNPROCESSABLE_ENTITY, json)),

  _500: (json, cb) => cb(null, response(Status.INTERNAL_SERVER_ERROR, json)),
  _502: (json, cb) => cb(null, response(Status.BAD_GATEWAY, json)),
  _504: (json, cb) => cb(null, response(Status.GATEWAY_TIMEOUT, json))
}

module.exports.returnHttp = function returnHttp(result, callback) {
  // Check for errors...
  if (result instanceof Error) {
    if (!result.hasOwnProperty('statusCode')) {
      // Errors should provide their own status code... otherwise they get 500
      result.statusCode = 500
    }
    // Put the other props into the outbound...
    result.body = {
      name: result.name,
      title: result.title,
      message: result.message
    }
  }
  let httpFn = http[`_${result.statusCode}`]
  if (typeof httpFn !== 'function')
    throw new Error(`${result.statusCode} does not have a corresponding http callback function.`)
  return httpFn(result.body, callback)
}
