const request = require('request');
const {HTTPLoggedOut} = require('../../models/HTTPError');
const CND_URL = 'https://www.carnextdoor.com.au/api/v2';

/**
 * Makes an HTTP req using 'request'. Always fills in the UA.
 * @param {Object} opts Request opts
 */
function httpRequest(opts) {
  // Do we have headers?
  if (!opts.hasOwnProperty('headers')) {
    opts.headers = {};
  }

  // Add in User Agent
  opts.headers['user-agent'] = process.env.HTTP_USER_AGENT;

  return new Promise(function(resolve, reject) {
    request(opts, function(err, response, body) {
      if (err) {
        return reject(err);
      }
      if (response.statusCode >= 300) {
        return reject(response);
      }
      return resolve(body);
    });
  });
}

/**
 * Quick check if this is an unauth'd redirect
 * @param {Response} response HTTP response from 'request' lib
 */
function isLoginRedirect(response) {
  return (
    response.statusCode === 302 && response.headers.location.includes('/login')
  );
}

module.exports = class CNDAPI {
  /**
   * Create a new API.
   * @param {APIKey} cndToken API key token
   */
  constructor(cndToken) {
    this.cndToken = cndToken;
  }

  /**
   * Issue JSON get request
   * @param {String} path API path to hit
   */
  static async login({email, password}) {
    const opts = {
      uri: CND_URL + '/auth',
      method: 'post',
      headers: {},
      resolveWithFullResponse: true,
      json: true,
      body: {
        email,
        password
      }
    };
    try {
      let body = await httpRequest(opts);
      return body.auth.token;
    } catch (e) {
      if (isLoginRedirect(e)) {
        throw new HTTPLoggedOut('Logged out.');
      }
      // Unknown error.
      throw e;
    }
  }

  /**
   * Issue JSON get request
   * @param {String} path API path to hit
   */
  async get(path) {
    const opts = {
      uri: CND_URL + path,
      method: 'get',
      headers: {
        'x-cnd-token': this.cndToken
      },
      resolveWithFullResponse: true,
      json: true
    };
    try {
      let body = await httpRequest(opts);
      return body;
    } catch (e) {
      if (isLoginRedirect(e)) {
        throw new HTTPLoggedOut('Logged out.');
      }
      // Unknown error.
      throw e;
    }
  }
};
