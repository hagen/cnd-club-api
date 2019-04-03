/* global describe, before, it, after */
const mochaPlugin = require('serverless-mocha-plugin')
const { sequelize } = require('../../../models/sql-model-base')
const { Account } = require('../../../models/account')
const { User } = require('../../../models/user')
const { UserAccounts } = require('../../../models/user-accounts')
const shortid = require('shortid')
const expect = mochaPlugin.chai.expect
const fnName = 'list'
let wrapped = mochaPlugin.getWrapper(fnName, `/${fnName}.js`, 'run')

describe(fnName, () => {
  before((done) => {
    done()
  })

  it(`should return empty invoices list where account has no Stripe Customer ID`, async () => {
		let account = await Account.create({
      name: 'test1',
      trial_ends: null
      // No stripe customer ID
    })
    let user = await User.create({
      first_name: 'test',
      last_name: 'test',
      email: 'test@email.com',
      auth0_id: shortid.generate() // Auth0 ID is unique
    })
    let ua = await UserAccounts.create({
      access_level: 'owner',
      account_id: account.id,
      user_id: user.id
    })
		let request = {
      auth: {
        account_id: account.id,
        user_id: user.id
      },
      queryStringParameters: {}
    }
    let response = await wrapped.run(request)
    expect(response).to.have.property('invoices')
    expect(response).to.have.property('invoices').to.be.an('array')
    expect(response.invoices).to.have.length(0)
		await ua.destroy()
    await user.destroy()
    await account.destroy()
  })

  it(`should 403 for non-owner`, async () => {
		let account = await Account.create({
      name: 'test1',
      trial_ends: null
      // No stripe customer ID
    })
    let user = await User.create({
      first_name: 'test',
      last_name: 'test',
      email: 'test@email.com',
      auth0_id: shortid.generate() // Auth0 ID is unique
    })
    let ua = await UserAccounts.create({
      access_level: 'access',
      account_id: account.id,
      user_id: user.id
    })
		let request = {
      auth: {
        account_id: account.id,
        user_id: user.id
      },
      queryStringParameters: {}
    }
    try {
      await wrapped.run(request)
    } catch(e) {
    	expect(e).to.have.property('statusCode').to.equal(403)
    }
		await ua.destroy()
    await user.destroy()
    await account.destroy()
  })

	after(async () => {
    sequelize.close()
	})
})
