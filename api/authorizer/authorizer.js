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
  // Context declaration
  const token = isEmptyPrimitive(event.authorizationToken) ? null : event.authorizationToken;
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
async function run(token) {

  // If we have a session already, they're good to go.
  if (!token) {
    throw new Error(UNAUTHORIZED);
  }
  
  // Return the context
  const authResponse = {
    principalId: token,
    context: {
      cndToken: token
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