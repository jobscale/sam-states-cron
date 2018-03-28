'use strict';

const env = require('./env.json');

import {Ami} from "./services/ami";
import {Instance} from "./services/instance";
import {Http} from "./services/http";
import {Util} from "./services/util";

const createAndRemoveAmi = () => {
    /**
     * Lambda function: create AMIs and delete expired AMIs
     */
    let ami = new Ami;
    return (new Instance).listInstances([{ Name: 'tag:Backup', Values: ['yes'] }])
        .then(instances => ami.createImages(instances))
        .then(images => ami.createTags(images))
        .then(() => ami.listExpiredImages(env.AMI.RETENTION_PERIOD))
        .then(images => ami.deleteImages(images))
        .then(mappings => ami.deleteSnapshots(mappings));
};

const run = (event) => {
    return new Promise((resolve, reject) => {
        createAndRemoveAmi().then((data) => {
            resolve(data);
        }).catch((e) => {
            reject(e);
        });
    });
};

exports.handler = (event, context, callback) => {

    console.log('event', JSON.stringify(event));

    let log = Util.init('Lambda CreateAmi');
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
