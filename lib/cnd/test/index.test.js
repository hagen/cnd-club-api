const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../env/.env.test.prod') });
require('should');
const CNDAPI = require('../index');

describe('CND browser and API interactions', () => {
	// before();

	let auth;
	it('should log in and return cookie, expires, memberId', async () => {
		auth = await CNDAPI.logIn({
			email: process.env.EMAIL,
			password: process.env.PASSWORD
		});
		auth.should.be.an.Object;
		auth.should.have.property('expires');
		auth.expires.should.be.a.Date;
		auth.should.have.property('cookie');
		auth.cookie.should.be.a.String;
		auth.should.have.property('memberId');
		auth.memberId.should.be.a.Number;
	});

	it('should not log in', async () => {		
		await CNDAPI.logIn({
			email: process.env.EMAIL,
			password: '123456789'
		}).should.be.rejected();
	});

	it('should get authenticated HTML', async () => {		
		let path = `/manage/cars`;
		let api = new CNDAPI(auth.cookie);
		let { html } = await api.getAuthHTML(path);
		html.should.be.a.String;
		html.should.match(/Members \| Car Next Door/);
	});

	it('should get updated cookie', async () => {		
		let path = `/manage/cars`;
		let api = new CNDAPI(auth.cookie);
		let { cookie } = await api.getAuthHTML(path);
		cookie.should.be.an.Object;
		cookie.should.have.property('key').equal('member_credentials');
		cookie.should.have.property('value');
	});

	// after();
})