'use strict';

const env = require("./env.json");

import {Http} from "./services/http";
import {Util} from "./services/util";

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

    let log = Util.init('Lambda AutoScaling');
    callback(null, log);

    run(event).then((data) => {
        log = Util.toString(data);
        console.log(log);
        callback(null, log);
        context.succeed(log);
    }).catch((e) => {
        log = Util.toString(e);
        console.log(log);
        callback(e, log);
        context.fail(log);
    });

};
