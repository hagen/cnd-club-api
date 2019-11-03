module.exports.StringOnlyError = class StringOnlyError extends Error {
  constructor({title, message}) {
    super();
    this.name = 'StringOnlyError';
    this.title = title || `Must be a string`;
    this.message = message;
  }
};
module.exports.NotEmptyError = class NotEmptyError extends Error {
  constructor({title, message}) {
    super();
    this.name = 'NotEmptyError';
    this.title = title || `Must not be empty`;
    this.message = message;
  }
};
