const { DataSyncJob } = require('../models/data-sync-job')
const { DataSyncWatermark } = require('../models/data-sync-watermark')
const { DataSyncSyncRecord } = require('../models/data-sync-sync-record')
const { DataSyncStepData } = require('../models/data-sync-step-data')
const { Product } = require('../models/Product')
const { Subscription } = require('../models/Subscription')
const { Patient } = require('../models/cliniko/Patient')
const { Recall } = require('../models/cliniko/Recall')
const moment = require('moment')
let TIMEOUT = 1 * 60 * 1000
let job = null;
let product = null;
let subscription = null;
module.exports.before = async function (params) {
    let { account, user } = params;
    product = await Product.create({
        name: 'resthooks',
        description: 'resthooks',
        price: 2500,
        tag: 'resthooks',
        stripe_product_id: 'prod_123456798',
        stripe_plan_id: 'plan_123456798',
        requires_data_sync: true
    })
    subscription = await Subscription.create({
        account_id: account.id,
        user_id: user.id,
        product_id: product.id,
        status: 'active',
        stripe_plan_id: '123456789',
        stripe_subscription_item_id: 'si_123456789'
    })
    let endBy = moment().add(TIMEOUT * 5, 'milliseconds')
    let context = {
        getRemainingTimeInMillis: function () {
            return endBy.diff(moment(), 'milliseconds')
        }
    }

    job = await DataSyncJob.create({
        // id
        account_id: account.id,
        state_machine_name: 'TEST_STATE_MACHINE',
        running: true
    })

    // Add account properties...
    let AddAccountProperties = require('../api-addons/datasync/AddAccountProperties');
    let output = await AddAccountProperties.run({
        account: account.toJSON(),
        job: job.toJSON()
    })
    let RunEndpointSync = require('../api-addons/datasync/RunEndpointSync');
    let response = await RunEndpointSync.run(output.endpoints['cliniko-patients'], context)
    let archivedResponse = await RunEndpointSync.run(output.endpoints['cliniko-patients-archived'], context)
    let deletedResponse = await RunEndpointSync.run(output.endpoints['cliniko-patients-deleted'], context)
    let settingsResponse = await RunEndpointSync.run(output.endpoints['cliniko-settings'], context)
    let RunRecallsSync = require('../api-addons/datasync/RunRecallsSync');
    let recallsResponse = await RunRecallsSync.run(output.endpoints['cliniko-recalls'], context)
    let syncResults = []
    output.endpoints = { 'cliniko-patients': response }
    syncResults.push({ ...output })
    output.endpoints = { 'cliniko-patients-archived': archivedResponse }
    syncResults.push({ ...output })
    output.endpoints = { 'cliniko-patients-deleted': deletedResponse }
    syncResults.push({ ...output })
    output.endpoints = { 'cliniko-settings': settingsResponse }
    syncResults.push({ ...output })
    output.endpoints = { 'cliniko-recalls': recallsResponse }
    syncResults.push({ ...output })

    // Merge parallel branches...
    let MergeSyncBranches = require('../api-addons/datasync/MergeSyncBranches')
    let mergedOutput = await MergeSyncBranches.run(syncResults)

    // Set account finished
    let SetAccountFinished = require('../api-addons/datasync/SetAccountFinished')
    await SetAccountFinished.run(mergedOutput)
    return {
        ...params,
        job,
        product,
        subscription
    };
}

module.exports.after = async function (params) {
    let { account } = params;

    // Delete Sync Step Data
    await DataSyncStepData.destroy({
        where: {
            job_id: job.id
        },
        force: true
    })

    // Delete all sync records
    await DataSyncSyncRecord.destroy({
        where: {
            account_id: account.id
        },
        force: true,
    })

    // Delete watermarks
    await DataSyncWatermark.destroy({
        where: {
            account_id: account.id,
        },
        force: true,
    })

    await job.destroy({ force: true });
    await subscription.destroy({ force: true });
    await product.destroy({ force: true });
    await Patient.destroy({
        where: {
            account_id: account.id
        }
    });
    await Recall.destroy({
        where: {
            account_id: account.id
        }
    });
    return params;
}