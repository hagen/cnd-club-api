module.exports.InvalidRestHookEventParameter = class InvalidRestHookEventParameter extends Error {
  constructor(message) {
    super(message)
    this.name = 'InvalidRestHookEventParameter'
    this.title = 'Invalid REST hook parameter'
    this.message = message
  }
}
module.exports.StringOnlyError = class StringOnlyError extends Error {
  constructor({ title, message }) {
    super()
    this.name = 'StringOnlyError'
    this.title = title || `Must be a string`
    this.message = message
  }
}
module.exports.NotEmptyError = class NotEmptyError extends Error {
  constructor({ title, message }) {
    super()
    this.name = 'NotEmptyError'
    this.title = title || `Must not be empty`
    this.message = message
  }
}
class EC2SpotError extends Error {
  constructor({ title, message, original }) {
    super()
    this.name = 'EC2SpotError'
    this.title = title || `Couldn't start an EC2 spot instance`
    this.message = message
    this.original = original
  }
}
module.exports.EC2SpotError = EC2SpotError
class ClinikoAccountChangeError extends Error {
  constructor({ title, message }) {
    super()
    this.name = 'ClinikoAccountChangeError'
    this.title = title || `May not change connected Cliniko account`
    this.message = message
  }
}
module.exports.ClinikoAccountChangeError = ClinikoAccountChangeError
class NoClinikoAPIEndpointForMetabaseDataModelTable extends Error {
  constructor({ title, table, message }) {
    super()
    this.name = 'NoClinikoAPIEndpointForMetabaseDataModelTable'
    this.title = title || `No Cliniko API endpoint for Metabase table`
    this.table = table
    this.message = message
  }
}
module.exports.NoClinikoAPIEndpointForMetabaseDataModelTable = NoClinikoAPIEndpointForMetabaseDataModelTable
class MetabaseDataModelFkFieldNotFound extends Error {
  constructor({ table, fields, fieldName, endpoint, modelField, message, title }) {
    super()
    this.name = 'MetabaseDataModelFkFieldNotFound'
    this.title = title || `Couldn't find a foreign key for Metabase data model field`
    this.table = table
    this.fields = fields
    this.fieldName = fieldName
    this.modelField = modelField
    this.endpoint = endpoint
    this.message = message
  }
}
module.exports.MetabaseDataModelFkFieldNotFound = MetabaseDataModelFkFieldNotFound
class NoMetabaseDatabaseMetadata extends Error {
  constructor({ title, field, foreignKey, message }) {
    super()
    this.name = 'NoMetabaseDatabaseMetadata'
    this.title = title || `Couldn't find a foreign key for Metabase data model field`
    this.field = field
    this.foreign_key = foreignKey
    this.message = message
  }
}
module.exports.NoMetabaseDatabaseMetadata = NoMetabaseDatabaseMetadata
class UnknownAutoClinicAction extends Error {
  constructor(value) {
    super()
    this.name = 'UnknownAutoClinicAction'
    this.title = `Action ${value} is unknown`
    this.message = `Action ${value} is unknown.`
  }
}
module.exports.UnknownAutoClinicAction = UnknownAutoClinicAction
class UnknownAutoClinicCondition extends Error {
  constructor(value) {
    super()
    this.name = 'UnknownAutoClinicCondition'
    this.title = `Condition ${value} is unknown`
    this.message = `Condition ${value} is unknown.`
  }
}
module.exports.UnknownAutoClinicCondition = UnknownAutoClinicCondition
class InvalidInvoiceToTemplateError extends Error {
  constructor({ name, title, message }) {
    super()
    this.name = name || 'InvalidInvoiceToTemplateError'
    this.title = title
    this.message = message
  }
}
module.exports.InvalidInvoiceToTemplateError = InvalidInvoiceToTemplateError
class MetabaseAPIPreconditionError extends Error {
  constructor({ name, title, message }) {
    super()
    this.name = name || 'MetabaseAPIPreconditionError'
    this.title = title
    this.message = message
  }
}
module.exports.MetabaseAPIPreconditionError = MetabaseAPIPreconditionError
class MetabaseAPIGraphRevisionMismatch extends Error {
  constructor({ name, title, message }) {
    super()
    this.name = name || 'MetabaseAPIGraphRevisionMismatch'
    this.title = title
    this.message = message
  }
}
module.exports.MetabaseAPIGraphRevisionMismatch = MetabaseAPIGraphRevisionMismatch

class NoMetabaseAccountError extends Error {
  constructor({ name, title, message }) {
    super()
    this.name = name || 'NoMetabaseAccountError'
    this.title = title
    this.message = message
  }
}
module.exports.NoMetabaseAccountError = NoMetabaseAccountError

class MetabaseAPIError extends Error {
  constructor({ name, title, message, response, body }) {
    super()
    this.name = name || 'MetabaseAPIError'
    this.title = title
    this.message = message
    this.response = response
    this.body = body
  }
}
module.exports.MetabaseAPIError = MetabaseAPIError

class ModelValidationError extends Error {
  constructor({ name, title, message }) {
    super()
    this.name = name || 'ModelValidationError'
    this.title = title
    this.message = message
  }
}
module.exports.ModelValidationError = ModelValidationError

class ClinikoUpdateApiKeyOnlyError extends Error {
  constructor({ name, title, message }) {
    super()
    this.name = name || 'ClinikoUpdateApiKeyOnlyError'
    this.title = title
    this.message = message
  }
}
module.exports.ClinikoUpdateApiKeyOnlyError = ClinikoUpdateApiKeyOnlyError
class ClinikoAPIError extends Error {
  constructor(params) { // { name, title, message }
    super()
    Object.assign(this, params)
    this.name = params.name || 'ClinikoAPIError'
  }
}
module.exports.ClinikoAPIError = ClinikoAPIError
class Auth0Error extends Error {
  constructor({ name, title, message, status, body }) {
    super()
    this.name = name || 'Auth0Error'
    this.title = title
    this.message = message
    this.status = status
    this.body = body
  }
}
module.exports.Auth0Error = Auth0Error
class StripeSignatureInvalid extends Error {
  constructor({ name, title, message }) {
    super()
    this.name = name || 'StripeSignatureInvalid'
    this.title = title
    this.message = message
  }
}
module.exports.StripeSignatureInvalid = StripeSignatureInvalid
class SquelQueryError extends Error {
  constructor({
      loadType,
      message,
      name,
      path,
      s3Uri,
      sql,
      stack,
      table,
      title,
      totalRecords,
      records,
      record,
    }) {
      super()
      this.loadType = loadType
      this.message = message
      this.name = name || 'SquelQueryError'
      this.s3Uri = path || s3Uri
      this.sql = sql
      this.stack = stack
      this.table = table
      this.title = title
      this.totalRecords = totalRecords
      this.records = records
      this.record = record
  }
}
module.exports.SquelQueryError = SquelQueryError
