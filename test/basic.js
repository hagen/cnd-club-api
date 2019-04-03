
const shortid = require('shortid')
const { Account } = require('../models/account')
const { User } = require('../models/user')
const { Product } = require('../models/product')
const { Subscription } = require('../models/subscription')
const { UserAccounts } = require('../models/user-accounts')

let account = null
let user = null
let link = null
let product = null
let subscription = null
module.exports.before = async function before() {
    // Create a product and account
    account = await Account.create({
        name: 'London Test Clinic',
        timezone: 'Europe/London'
    })
    user = await User.create({
        first_name: 'test',
        last_name: 'test',
        email: 'test@email.com',
        auth0_id: shortid.generate() // Auth0 ID is unique
    })
    link = await UserAccounts.create({
        account_id: account.id,
        user_id: user.id,
        access_level: 'owner'
    })
    product = await Product.create({
        name: 'Test rest hooks',
        description: 'Test rest hooks product',
        stripe_plan_id: 'plan_123456789',
        stripe_product_id: 'prod_987654312',
        requires_cliniko: false,
        requires_data_sync: true,
        tag: 'rest-hooks'
    })
    subscription = await Subscription.create({
        account_id: account.id,
        user_id: user.id,
        product_id: product.id,
        stripe_subscription_item_id: 'si_987654321',
        status: 'active'
    })
    return {
        account,
        user,
        link,
        product,
        subscription
    }
}
module.exports.after = async function after() {

    await subscription.destroy({ force: true })
    await product.destroy({ force: true })
    await link.destroy({ force: true })
    await user.destroy({ force: true })
    await account.destroy({ force: true })
}