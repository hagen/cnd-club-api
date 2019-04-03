const { unpackHttp, returnHttp } = require('../../lib/LambdaProxy');
const cheerio = require('cheerio');
const { getHTML } = require('../../lib/cnd-api');

module.exports = {
  handle, run
};

async function handle(event, context, callback) {
  try {
    let body = await run(unpackHttp(event))
    return returnHttp({ statusCode: 200, body }, callback)
  } catch(e) {
		console.error(e)
    return returnHttp(e, callback)
  }
}
/**
 * Main function to run.
 * @param  {[type]} params [description]
 * @return {[type]}        [description]
 */
async function run(params) {
  const { cookie } = params.auth;

  let html = await fetchCarsHTML(cookie);
  let cars = extractCars(html);
  
  return { cars, total: cars.length };
}


/**
 * Returns raw HTML from the Manage Cars page on CND.
 * @param {Cookie} cookie The Cookie
 */
async function fetchCarsHTML(cookie) {
  let url = `https://www.carnextdoor.com.au/manage/cars`;
  let html = await getHTML(cookie, url);
  return html;
}


/**
 * Use cheerio to fetch all the car names of this member.
 * On the manage cars page, all h4 tags are cars.
 * Within the H4, is an 'a' (name) and 'span' (rego)
 * @param {String} html 
 */
function extractCars(html) {  
  let $ = cheerio.load(html);
  let headers = $('h4');
  let cars = [];
  headers.each(function() {
    let anchor = $(this)('a');
    let span = $(this)('span');

    // Props for the car...
    let href = anchor.attr('href');
    let idMatch = href.match(/\d+/);
    let id = null;
    if (idMatch) {
      id = parseInt(idMatch[0], 10);
    }
    let car = anchor.text().trim();
    let registration = span.text().trim();
    cars.push({
      id,
      car,
      registration
    })
  });
  return cars;
}