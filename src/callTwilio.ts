'use strict';

const env = require('./env.json');

import {Http} from "./services/http";
import {Util} from "./services/util";

const run = (event) => {
    // multipart/form-data
    // text/plain
    // application/json
    // application/x-www-form-urlencoded
    return (new Http).request(env.url.call, 'text=alarm', 'POST', 'http', 'application/x-www-form-urlencoded');
};

/**
 * handler
 * @param event
 * @param context
 * @param callback
 */
exports.handler = (event, context, callback) => {

    console.log('event', JSON.stringify(event));

    let log = Util.init('Lambda Calling');
    callback(null, log);

    run(event).then((data) => {
        log = Util.toString(data);
        console.log(log);
        callback(null, log);
        context.succeed(log);
    }).catch((e) => {
        log = Util.toString(e);
        console.log(log);
        (new Http).postError(log).then((data) => {
            callback(e, log);
            context.fail(log);
        });
    });

};

(() => {
    console.log(process.argv);
    if (process.argv[2] !== 'test') {
        return;
    }
    Util.run(exports.handler);
})();
