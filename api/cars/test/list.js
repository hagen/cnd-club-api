/* global describe, before, it, after */
const mochaPlugin = require('serverless-mocha-plugin')
const expect = mochaPlugin.chai.expect
let wrapped = mochaPlugin.getWrapper('list', '/list.js', 'run')
const shortid = require('shortid')
const { Account } = require('../../../models/account')
const { User } = require('../../../models/user')
const { UserAccounts } = require('../../../models/user-accounts')

describe('list', () => {
  before((done) => {
    done()
  })

  it(`list all accounts of user (1 account exists)`, async () => {
    // Create account (trialling), user, account user link
    let account = await Account.create({
      name: 'test1'
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
      }
    }
    let response = await wrapped.run(request)
    expect(response).to.have.property('accounts')
    expect(response.accounts).to.be.an('array')
    expect(response.accounts).to.have.length(1)
    response.accounts.forEach(account => {
      expect(account).to.not.have.property('user_accounts')
    })
    // Destroy
    await ua.destroy({ force: true })
    await account.destroy({ force: true })
    await user.destroy({ force: true })
  })

  it(`list accounts of user (> 1 account)`, async () => {
    // Create account (trialling), user, account user link
    let account = await Account.create({
      name: 'test1'
    })
    let account2 = await Account.create({
      name: 'test2'
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
    let ua2 = await UserAccounts.create({
      access_level: 'access',
      account_id: account2.id,
      user_id: user.id
    })
    let request = {
      auth: {
        account_id: account.id,
        user_id: user.id
      }
    }
    let response = await wrapped.run(request)
    expect(response).to.have.property('accounts')
    expect(response.accounts).to.be.an('array')
    expect(response.accounts).to.have.length(2)
    response.accounts.forEach(account => {
      expect(account).to.not.have.property('user_accounts')
    })
    // Destroy
    await ua.destroy({ force: true })
    await ua2.destroy({ force: true })
    await user.destroy({ force: true })
    await account.destroy({ force: true })
    await account2.destroy({ force: true })
  })

  it(`non-user returns 404`, async () => {
    let request = {
      auth: {
        account_id: 'DEFAULT',
        user_id: 9999999
      }
    }
    try {
      await wrapped.run(request)
    } catch(e) {
      expect(e).to.have.property('statusCode').equal(404)
      expect(e).to.have.property('message').to.include('9999999')
    }
  })

  after((done) => {
    done()
  })
})
