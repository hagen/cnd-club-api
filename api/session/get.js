const { unpackHttp, returnHttp } = require('../../lib/lambda-proxy');
const CNDAPI = require('../../lib/cnd');
const { SessionCookie } = require('../../models/SessionCookie');
const { HTTPError } = require('../../models/HTTPError');

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
    return returnHttp({ statusCode: 200, body }, callback)
  } catch(e) {
    return returnHttp(e, callback)
  }
}

/**
 * Try to hit a CND page using the cookie on hand.
 * If we error, the cookie is dead.
 * @param {Object} params Lambda proxy params
 */
async function run(params) {
  let { cookie, sessionId, memberId, email } = params.auth;
  // Attempt to test this...
  let api = new CNDAPI(cookie);
  try {
    let urlPath = `/manage/cars`;
    await api.getAuthHTML(urlPath);
  } catch(e) {
    await SessionCookie.delete(sessionId);
    throw new HTTPError(401, {
      name: 'Unauthorized',
      title: 'Unauthorized',
      message: e.message
    });
  }
  return { 
    id: sessionId,
    memberId,
    email
  };
}
