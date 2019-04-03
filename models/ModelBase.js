const { isLambda } = require('../lib/utils');
const dynamoose = require('dynamoose');
if (isLambda()) {
	dynamoose.AWS.config.update({
		region: process.env.REGION
	});
} else {
	dynamoose.AWS.config.update({
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		region: process.env.REGION
	});
}
module.exports = dynamoose;