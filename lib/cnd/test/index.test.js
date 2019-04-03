require('should');
const api = require('../index');
const EMAIL = 'hagen.dittmer@gmail.com';
const PASSWORD = 'hagenisthebest';

describe('CND browser and API interactions', () => {
	// before();

	let auth;
	it('should log in and return cookie, expires, memberId', async () => {
		auth = await api.logIn({
			email: EMAIL,
			password: PASSWORD
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
		await api.logIn({
			email: EMAIL,
			password: '123456789'
		}).should.be.rejected();
	});

	it('should get authenticated HTML', async () => {		
    let url = `https://www.carnextdoor.com.au/manage/cars`;
		let html = await api.getAuthHTML(auth.cookie, url);
		html.should.be.a.String;
		html.should.match(/Members \| Car Next Door/);
	});

	// after();
})