const dynamoose = require('./ModelBase');
const schema = {
	id: {
		type: String,
		hashKey: true
	},
	cookie: String,
	expires: Number,
	memberId: Number,
	email: String
};
const SessionCookie = dynamoose.model(process.env.DYNAMODB_TABLE_SESSION_COOKIE, schema);
module.exports = { SessionCookie };