const dynamoose = require('./ModelBase');
const Schema = dynamoose.Schema;
const schema = new Schema(
	{
		id: {
			type: String,
			hashKey: true
		},
		urlPath: String,
		response: Object,
		createdAt: Number
	},
	{
		useNativeBooleans: true,
		useDocumentTypes: true
	}
);
const ResponseCache = dynamoose.model(process.env.DYNAMODB_TABLE_RESPONSE_CACHE, schema);
module.exports = { ResponseCache };