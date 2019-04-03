const request = require('request');
const cheerio = require('cheerio');
const { InvalidHTTPCredentials } = require('../../models/HTTPError');

/**
 * Collect an auth cookie/session from CND.
 * Uses log in and authenticity token.
 * @param {Object} param Email and password
 */
async function logIn({ email, password }) {

    let cookieJar = request.jar();

    // Get authenticty token from sign in screen...
    let signInScreenResponse = await new Promise(function(resolve, reject) {
        request({
            uri: `https://www.carnextdoor.com.au/login`,
            method: 'get',
            jar: cookieJar,
            followAllRedirects: false
        }, function(err, response, body) {
            if (err) return reject(err);
            return resolve(body);
        })
    });
    // Collect auth token...
    let $ = cheerio.load(signInScreenResponse);
    let authenticityToken = $('#new_member_session > input[name="authenticity_token"]').val();

    // Sign in...
    // const cookieString = cookieJar.getCookieString('https://www.carnextdoor.com.au');
    const options = {
        method: 'POST',
        url: `https://www.carnextdoor.com.au/member_sessions`,
        jar: cookieJar,
        resolveWithFullResponse: true,
        followAllRedirects: true,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'origin': 'https://www.carnextdoor.com.au',
            'referer': 'https://www.carnextdoor.com.au/login',
            'User-Agent': 'Hagen Dittmer/Nodejs'
        },
        formData: {
            authenticity_token: authenticityToken,
            'member_session[email]': email,
            'member_session[password]': password
        }
    };

    // Once we've logged in, return the cookie - that's all we want
    try {
        let response = await new Promise(function(resolve, reject) {
            request(options, function(err, response, body) {
                if (err) return reject(err);
                if (response.statusCode === 422) return reject(body);
                return resolve(body);
            });
        });
        // This means invalid credentials
        if (response.includes('There was an error with your email/password combination. Please try again.')) {
            throw new InvalidHTTPCredentials('Invalid email or password');
        }
        // Member ID search...
        let memberIdMatch = response.match(/userId:\s{1}\d+,/);
        let memberId = null;
        if (memberIdMatch.length) {
            let userIdPart = memberIdMatch[0];
            let userIdMatch = userIdPart.match(/\d+/);
            if (userIdMatch.length) {
                memberId = parseInt(userIdMatch[0], 10);
            }
        }
        // The important cookie is the member_credentials, which will
        // also bear an expiry. We need this.
        let cookies = cookieJar.getCookies('https://www.carnextdoor.com.au');
        let memberCredsCookie = cookies.find(cookie => cookie.key === 'member_credentials');
        return {
            cookie: cookieJar.getCookieString('https://www.carnextdoor.com.au'),
            expires: memberCredsCookie.expires,
            memberId
        }
    } catch(e) {
        console.error(e);
        throw e;
    }
}
module.exports.logIn = logIn;




/**
 * Fetches content from CND URLs, which to access, you need an authenticated
 * session, via. cookie.
 * @param {String} cookie Stringified cookie
 * @param {String} url CND Url to load up
 */
async function getAuthHTML(cookie, url) {
    let cookieJar = bakeCookies(cookie);
    try {
        let html = await new Promise(function(resolve, reject) {
            request({
                uri: url,
                method: 'get',
                jar: cookieJar,
                resolveWithFullResponse: true,
                followAllRedirects: false,
                followRedirect: false
            }, function(err, response, body) {                
                if (err) {
                    return reject(err);
                }
                // If it's telling us to go to login, then that's an unauth cookie.
                if (isLoginRedirect(response)) {
                    return reject({
                        name: 'Unauthorised',
                        title: 'Unauthorised request',
                        message: 'The request is unauthorised - redirected to log in.'
                    });
                }
                return resolve(body);
            })
        });
        return html;
    } catch (e) {
        throw e;
    }
}
module.exports.getAuthHTML = getAuthHTML;





/**
 * Parse cookie string and put into a jar.
 * @param {String} cookie The cookie string from DB
 */
function bakeCookies(cookie) {
    let cookieJar = request.jar();
    let cookies = cookie.split(';');
    cookies.forEach(cookie => cookieJar.setCookie(cookie, `https://www.carnextdoor.com.au`));
    return cookieJar;
}





/**
 * Quick check if this is an unauth'd redirect
 * @param {Response} response HTTP response from 'request' lib
 */
function isLoginRedirect(response) {
    return response.statusCode === 302 && response.headers.location.includes('/login');
}




async function getJSON(cookie, path) {
    let cookieJar = bakeCookies(cookie);
    try {
        let json = await new Promise(function(resolve, reject) {
            request({
                uri: 'https://www.carnextdoor.com.au' + path,
                method: 'get',
                jar: cookieJar,
                resolveWithFullResponse: true,
                json: true
            }, function(err, response, json) {                
                if (err) {
                    return reject(err);
                }
                // If it's telling us to go to login, then that's an unauth cookie.
                if (isLoginRedirect(response)) {
                    return reject({
                        name: 'Unauthorised',
                        title: 'Unauthorised request',
                        message: 'The request is unauthorised - redirected to log in.'
                    });
                }
                return resolve(json);
            })
        });
        return json;
    } catch (e) {
        throw e;
    }
}
module.exports.getJSON = getJSON;