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

module.exports.InvalidHTTPCredentials = class InvalidHTTPCredentials extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidHTTPCredentials';
    this.title = 'Invalid credentials';
  }
}
