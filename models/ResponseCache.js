const dynamoose = require('./ModelBase');
const schema = {
	id: {
		type: String,
		hashKey: true
	},
	response: Object,
	createdAt: Number
};
const ResponseCache = dynamoose.model(process.env.DYNAMODB_TABLE_RESPONSE_CACHE, schema);
module.exports = { ResponseCache };