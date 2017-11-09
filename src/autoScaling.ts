'use strict';

const env = require("./env.json");
import {Http} from "./services/http";

const prefix = 'web';

const run = (event) => {
    return Promise.all(event.Records.map((record) => {
        let sns = record.Sns;
        let subject = sns.Subject;
        let message = JSON.parse(sns.Message);
        let service = message.Service;
        let string = message.Description;
        let fail = string.match(/fail/);
        let channel = fail ? '#alert' : env.channel.autoScaling;
        let icon = fail ? ':fire:' : env.icon.autoScaling;
        return (new Http).postSlack(`${prefix}: ${subject} ${string}`, service, icon, channel, true);
    }));
};

exports.handler = (event, context, callback) => {

    console.log('event', JSON.stringify(event));

    let log = 'Lambda AutoScaling action.';
    callback(null, log);

    run(event).then((data) => {
        log = JSON.stringify(data);
        console.log(log);
        callback(null, log);
        context.succeed(log);
    }).catch((err) => {
        log = JSON.stringify(err);
        console.log(log);
        callback(err, log);
        context.fail(log);
    });

};
