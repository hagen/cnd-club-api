
const { Recall } = require('../models/cliniko/Recall')
let recall = null
module.exports.before = async function before(params) {
    recall = await Recall.create({
        account_id: params.account.id,
        db_username: `d_${params.account.id}`,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        id: 911952,
        recalled: null,
        'type': '1 year',
        'date': '2019-01-01',
        recalled_by: null,
        patient_id: 11684870,
        patient_name: 'Hagen D',
        email: 'hagen.dittmer@gmail.com',
        address: null,
        notes: 'Recall due'
    });
    return {
        ...params,
        recall
    };
}
module.exports.after = async function after() {
    await recall.destroy({ force: true });
}