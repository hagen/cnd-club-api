const { unpackHttp, returnHttp } = require('../../lib/lambda-proxy');
const { HTTPError } = require('../../models/HTTPError');
const { SessionCookie } = require('../../models/SessionCookie');
const CNDAPI = require('../../lib/cnd');
const { randomHash } = require('../../lib/utils');
const crypto = require('crypto');
const moment = require('moment');

module.exports = { handle, run }

/**
 *
 * @param  {[type]}   event    [description]
 * @param  {[type]}   context  [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
async function handle(event, context, callback) {
  try {
    let params = unpackHttp(event)
    let body = await run(params)
    return returnHttp({ statusCode: 201, body }, callback)
  } catch(e) {
    return returnHttp(e, callback)
  }
}

/**
 * Handler function
 * @param {Object} params Lambda proxy params
 */
async function run(params) {

  // params body includes email and password.
  let { email, password } = params.body;

  let cookie = null;
  let memberId = null;
  let expires = null;
  try {
    let result = await CNDAPI.logIn({ email, password });
    cookie = result.cookie;
    memberId = result.memberId;
    expires = result.expires;
  } catch (e) {
    throw new HTTPError(403, {
      name: e.name,
      title: 'Log-in failed',
      message: e.message
    });
  }

  // Save the cookie to DynamoDB.  
  let session = new SessionCookie({
    id: randomHash(),
    cookie,
    expires: moment(expires).unix(),
    email,
    memberId,
  });
  await session.save();

  // return the session Id, member Id, and email - to help with identifying the
  // Zapier connection.
  return {
    id: session.id,
    memberId,
    email
  }
}
