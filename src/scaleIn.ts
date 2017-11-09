'use strict';

const env = require("./env.json");
import {Http} from "./services/http";

const run = (event) => {
    return Promise.all(event.Records.map((record) => {
        let msg = JSON.parse(record.Sns.Message);
        return new Promise((resolve, reject) => {
            (new Http).request(env.url.scaleIn, msg.EC2InstanceId, 'POST', 'http', 'text/plain').then((data) => {
                resolve(data);
            }).catch((e) => {
                resolve(e);
            });
        });
    }));
};

exports.handler = (event, context, callback) => {

    console.log('event', JSON.stringify(event));

    let log = 'AutoScaling ScaleIn action.';
    callback(null, log);

    run(event).then((data) => {
        log = JSON.stringify(data);
        console.log(log);
        callback(data, log);
        context.succeed(log);
    }).catch((e) => {
        log = JSON.stringify(e);
        console.log(log);
        callback(e, log);
        context.fail(log);
    });

};
