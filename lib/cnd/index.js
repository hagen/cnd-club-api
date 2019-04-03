const request = require('request');
const cheerio = require('cheerio');
const { 
    HTTPLoggedOut,
    HTTPInvalidCredentials,
    MissingSessionCookie
} = require('../../models/HTTPError');
const CND_URL = 'https://www.carnextdoor.com.au';


/**
 * Makes an HTTP req using 'request'. Always fills in the UA.
 * @param {Object} opts Request opts
 */
function httpRequest(opts) {
    // Do we have headers?
    if (!opts.hasOwnProperty('headers')) {
        opts.headers = {};
    }

    // Add in User Agent
    opts.headers['user-agent'] = process.env.HTTP_USER_AGENT;

    return new Promise(function(resolve, reject) {
        request(opts, function(err, response, body) {
            if (err) {
                return reject(err);
            }
            if (response.statusCode >= 300) {
                return reject(response);
            }
            // If a cookie jar came in, we need to 
            // check if the expires of our member credentials
            // has been updated. If so, the caller will want to know
            // this to ensure the expires against the cookie
            // record is also updated (so we don't needlessly expire)
            // cookies ourselves.
            if (opts.hasOwnProperty('jar')) {
                let cookies = opts.jar.getCookies(CND_URL);
                let memberCredsCookie = cookies.find(cookie => cookie.key === 'member_credentials');
                return resolve({ body, cookie: memberCredsCookie });
            }
            return resolve({ body, cookie: null });
        })
    });
}




/**
 * In order to sign in, we need the authenticity token/nonce from the sign
 * in screen. Typical for form-based session auth.
 * @param {CookieJar} cookieJar 
 */
async function fetchAuthenticityToken(cookieJar) {    
    // Get authenticty token from sign in screen...
    let opts = {
        uri: `${CND_URL}/login`,
        method: 'get',
        jar: cookieJar,
        followAllRedirects: false
    };
    let signInScreenResponse;
    try {
        let { body } = await httpRequest(opts);
        signInScreenResponse = body;
    } catch(e) {
        throw e;
    }

    // Collect auth token...
    let $ = cheerio.load(signInScreenResponse);
    let authenticityToken = $('#new_member_session > input[name="authenticity_token"]').val();
    return authenticityToken;
}





/**
 * Parse cookie string and put into a jar.
 * @param {String} cookie The cookie string from DB
 */
function bakeCookies(cookie) {
    if (!cookie) {
        throw new MissingSessionCookie();
    }
    let cookieJar = request.jar();
    let cookies = cookie.split(';');
    cookies.forEach(cookie => cookieJar.setCookie(cookie, CND_URL));
    return cookieJar;
}





/**
 * Quick check if this is an unauth'd redirect
 * @param {Response} response HTTP response from 'request' lib
 */
function isLoginRedirect(response) {
    return response.statusCode === 302 && response.headers.location.includes('/login');
}




module.exports = class CNDAPI {


    /**
     * Create a new API. Can also update session cookie
     * expiry on each HTTP call.
     * @param {SessionCookie} session Session cookie
     */
    constructor(cookie) {
        this.cookie = cookie;
    }


    

    /**
     * Collect an auth cookie/session from CND.
     * Uses log in and authenticity token.
     * @param {Object} param Email and password
     */
    static async logIn({ email, password }) {
        let cookieJar = request.jar();
        let authenticityToken = await fetchAuthenticityToken(cookieJar);

        // Sign in...
        const opts = {
            method: 'post',
            url: `${CND_URL}/member_sessions`,
            jar: cookieJar,
            resolveWithFullResponse: true,
            followAllRedirects: true,
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'origin': 'https://www.carnextdoor.com.au',
                'referer': 'https://www.carnextdoor.com.au/login',
            },
            formData: {
                authenticity_token: authenticityToken,
                'member_session[email]': email,
                'member_session[password]': password
            }
        };

        // Once we've logged in, return the cookie - that's all we want
        try {
            // Returns the transformed body, and the member_credentials cookie.
            let { body, cookie } = await httpRequest(opts);

            // This means invalid credentials. HTTP Request won't throw on this,
            // as CND doesn't send a 401; it redirects to the /login page.
            if (body.includes('There was an error with your email/password combination. Please try again.')) {
                throw new HTTPInvalidCredentials(body);
            }

            // Member ID search...
            let memberIdMatch = body.match(/userId:\s{1}\d+,/);
            let memberId = null;
            if (memberIdMatch.length) {
                let userIdPart = memberIdMatch[0];
                let userIdMatch = userIdPart.match(/\d+/);
                if (userIdMatch.length) {
                    memberId = parseInt(userIdMatch[0], 10);
                }
            }

            // Return the whole cookie jar (as a string) and the expires of
            // the member creds cookie.
            return {
                cookie: cookieJar.getCookieString(CND_URL),
                expires: cookie.expires, // Member credentials cookie expires
                memberId
            }
        } catch(e) {
            // console.error(e);
            throw e;
        }
    }




    /**
     * Fetches content from CND URLs, which to access, you need an authenticated
     * session, via. cookie.
     * @param {String} cookie Stringified cookie
     * @param {String} url CND Url to load up
     */
    async getAuthHTML(path) {        
        let cookieJar = bakeCookies(this.cookie);
        let opts = {
            uri: CND_URL + path,
            method: 'get',
            jar: cookieJar,
            resolveWithFullResponse: true,
            
            // Specifically don't follow redirects (I don't know which of these is actually respected).
            followAllRedirects: false,
            followRedirect: false
        };
        try {
            let { body, cookie } = await httpRequest(opts);
            return { html: body, cookie };
        } catch (e) {
            if (isLoginRedirect(e)) {
                throw new HTTPLoggedOut('Logged out.');
            }

            // Unknown error.
            throw e;
        }
    }




    async getJSON(path) {
        let cookieJar = bakeCookies(this.cookie);
        const opts = {
            uri: CND_URL + path,
            method: 'get',
            jar: cookieJar,
            resolveWithFullResponse: true,
            json: true
        };
        try {
            let { body, cookie } = await httpRequest(opts);
            return { json: body, cookie };
        } catch (e) {
            if (isLoginRedirect(e)) {
                throw new HTTPLoggedOut('Logged out.');
            }

            // Unknown error.
            throw e;
        }
    }
}