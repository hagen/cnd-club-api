const crypto = require('crypto');
/**
 * Are we on Lambda?
 */
const isLambda = () => {
  return process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined
}




/**
 * Checks if the babel polyfill is in global context
 */
const isWebpack = () => {
  return global._babelPolyfill !== undefined
}




/**
 * Returns boolean if the primitive is considered empty.
 * Returns null for values that are not string, number or boolean.
 * @param {String/Boolean/Number} value The primitve value to check
 */
const isEmptyPrimitive = value => {
  if (value === null) return true;
  if (typeof value === 'boolean') return false;
  if (typeof value === 'number') return false;
  if (typeof value === 'string') {
    let str = value.trim();
    if (str.length === 0) return true;
    return false;
  }
  return null;
}
module.exports = {
  isLambda,
  isWebpack,
  isEmptyPrimitive
}




function arrayToKeyedObject(arr, key) {
	return arr.reduce((memo, item) => {
		memo[item[key].toString()] = item;
		return memo;
	}, {});
}
module.exports.arrayToKeyedObject = arrayToKeyedObject;




const md5 = (string) => crypto.createHash('md5').update(string).digest('hex');
module.exports.md5 = md5;
