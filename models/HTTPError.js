module.exports.HTTPError = class HTTPError extends Error {
  constructor(statusCode, body) {
    super()
    this.statusCode = statusCode
    this.statusMessage = body.message || ''
    // Old params
    this.name = body.name || 'HttpError'
    this.title = body.title || `HTTP ${statusCode} error`
    this.message = body.message || ''
  }
}

module.exports.HTTPInvalidCredentials = class HTTPInvalidCredentials extends Error {
  constructor(responseBody) {
    super(responseBody);
    this.name = 'HTTPInvalidCredentials';
    this.title = 'Invalid credentials';
    this.statusCode = 401;
    this.statusMessage = 'Your email/password combination was invalid.';
    this.body = responseBody;
  }
}

module.exports.HTTPLoggedOut = class HTTPLoggedOut extends Error {
  constructor(responseBody) {
    super(responseBody);
    this.name = 'HTTPLoggedOut';
    this.title = 'Session expired';
    this.statusCode = 401;
    this.statusMessage = `Your session has expired. You've been logged out.`;
    this.body = responseBody;
  }
}

module.exports.MissingSessionCookie = class MissingSessionCookie extends Error {
  constructor(message) {
    super(message);
  }
}
