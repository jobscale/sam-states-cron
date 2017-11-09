'use strict';

const env = require('./env.json');

import {Http} from "./services/http";

const joinNameValue = (json) => {
    if (!json || !json.length) {
        return '';
    }
    let array = [];
    json.forEach((item, key) => {
        array.push(item.name + ':' + item.value);
    });
    return array.join(',');
};

const run = (event) => {
    let name = env.name.warning;
    let icon = env.icon.warning;
    let channel = env.channel.warning;
    let http = new Http;
    return Promise.all((event.Records || []).map((rec) => {
        if (!rec.Sns) {
            return null;
        }
        let sns = JSON.parse(rec.Sns.Message);
        let status = sns.NewStateValue;
        if (status === "ALARM") {
            status = ":exclamation: " + status;
        }
        if (status === "OK") {
            status = ":white_check_mark: " + status;
        }
        let trigger = sns.Trigger || {};
        let message = trigger.Namespace + ": " + joinNameValue(trigger.Dimensions) + ": " + trigger.MetricName + "\n" +
            "*" + status + ": " + sns.AlarmDescription + "*\n" +
            sns.NewStateReason;
        return http.postSlack(message, name, icon, channel, true);
    }));
};

/**
 * handler
 * @param event
 * @param context
 * @param callback
 */
exports.handler = (event, context, callback) => {

    console.log('event', JSON.stringify(event));

    let log = 'Lambda Warning action.';
    callback(null, log);

    run(event).then((data) => {
        log = JSON.stringify(data);
        console.log(log);
        callback(null, log);
        context.succeed(log);
    }).catch((e) => {
        log = JSON.stringify(e);
        console.log(log);
        callback(e, log);
        context.fail(log);
    });

};
