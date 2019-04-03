const moment = require('moment');
const { SessionCookie } = require('../../models/SessionCookie');
const UNAUTHORIZED = 'Unauthorized';
const arn = '*'; //event.methodArn
const { isEmptyPrimitive } = require('../../lib/utils');
module.exports = { handle };





/**
 * Handler for all Authorization schemes
 * @param  {[type]}   event    [description]
 * @param  {[type]}   context  [description]
 * @param  {Function} callback [description]
 * @return {Promise}           [description]
 */
async function handle(event, context, callback) {
	// context.callbackWaitsForEmptyEventLoop = false
  // Context declaration
  const token = isEmptyPrimitive(event.authorizationToken) ? '--missing--' : event.authorizationToken;
  let result = null;
  try {
    result = await run(token);
  } catch(e) {
    return callback(e.message, null);
  }
  return callback(null, result);
}




/**
 * handles Bearer token authnetication. Namely by validating the JWT.
 */
async function run(sessionId) {

  // If we have a session already, they're good to go.
  let session = await SessionCookie.get(sessionId);
  if (!session) {
    throw new Error(UNAUTHORIZED);
  }

  // Or if their cookie expired, where the expires datetime
  // is now before the current datetime;
  if (moment.unix(session.expires).isBefore(moment())) {
    throw new Error(UNAUTHORIZED);
  }
  
  // Return the context
  const authResponse = {
    principalId: session.memberId.toString(),
    context: {
      sessionId: session.id,
      memberId: session.memberId.toString(),
      cookie: session.cookie
    },
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: arn
        }
      ]
    }
  };

  return authResponse;
}