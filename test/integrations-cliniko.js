const { Integration } = require('../models/integration')
const { ClinikoBrowser } = require('../lib/cliniko-api/browser')
let integrations = []
module.exports.before = async function before(params) {
    let api = await Integration.create({
        account_id: params.account.id,
        user_id: params.user.id,
        service: 'cliniko',
        property1: 'hagen-s-awesome-clinic',
        extra_params: {
            "account" : {
                "country" : "Australia",
                "country_code" : "AU",
                "currency_symbol" : "$",
                "id" : 26270,
                "name" : "Hagen's Super Epic Clinic",
                "subdomain" : "hagen-s-awesome-clinic",
                "time_zone" : "Melbourne"
            },
            "api_key" : "2126ce2f46d639c1d4970b9b34a5408b",
            "calendar" : {
                "end_hour" : 22,
                "multiple_appointments_gap" : false,
                "show_current_time_indicator" : true,
                "start_hour" : 7,
                "timeslot_height_in_pixels" : 18,
                "timeslot_size_in_minutes" : 15
            },
            "integrations" : {
                "mail_chimp" : {
                    "enabled" : true
                },
                "xero" : {
                    "enabled" : false
                }
            },
            "links" : {
                "self" : "https://api.cliniko.com/v1/settings/public"
            },
            "online_bookings" : {
                "calendar_info" : null,
                "daily_bookings_limit" : 10,
                "enabled" : false,
                "logo_url" : null,
                "max_appointments_per_day_segment" : 1,
                "min_hours_advance_required_to_book" : 1,
                "min_hours_notice_for_patient_cancellation" : 24,
                "notify_practitioner_by_email" : false,
                "notify_practitioner_by_sms" : false,
                "policy" : null,
                "privacy_policy_url" : null,
                "require_patient_address" : false,
                "show_appointment_duration" : true,
                "show_prices" : false
            },
            "reminders" : {
                "default_reminder_type" : "SMS & Email"
            },
            "sms" : {
                "patient_accept_sms_marketing_by_default" : true
            },
            "terminology" : {
                "patient" : "patient",
                "titles" : [
                    "Mr",
                    "Ms",
                    "Mrs",
                    "Miss",
                    "Mx",
                    "Dr",
                    "Master"
                ]
            },
            "user" : {
                "created_at" : "2016-02-08T05:10:36Z",
                "email" : "hagen.dittmer@gmail.com",
                "first_name" : "Hagen",
                "id" : 58254,
                "last_name" : "Dittmer",
                "links" : {
                    "self" : "https://api.cliniko.com/v1/user"
                },
                "role" : "administrator",
                "time_zone" : "Melbourne",
                "title" : "Dr",
                "updated_at" : "2018-07-12T00:04:52Z",
                "user_active" : true
            },
            "wait_list" : {
                "default_wait_list_expiry_period" : 14
            }
        }
    })
    integrations.push(api);

    // Get a cookie from Cliniko...
    let session = new ClinikoBrowser(api.property1);
    const email = 'hagen.dittmer@gmail.com';
    const password = 'hagenisthebest';
    let cookie = await session.login(api.extra_params.account.id, email, password);
    let browser = await Integration.create({
        account_id: params.account.id,
        user_id: params.user.id,            
        service: 'cliniko-browser',
        property1: 'hagen-s-awesome-clinic',
        extra_params: {
            cookie,
            subdoman: api.property1,
            email,
            password
        }
    })
    integrations.push(browser);
    return {
        ...params,
        integrations
    }
}
module.exports.after = async function after() {
    await Promise.all(integrations.map(integration => integration.destroy({ force: true })))
}