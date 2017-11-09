'use strict';

const env = require('./env.json');

import {Ami} from "./services/ami";
import {Instance} from "./services/instance";
import {Http} from "./services/http";

const suffix = 'tokyo';

const createAndRemoveAmi = () => {
    /**
     * Lambda function: create AMIs and delete expired AMIs
     */
    let ami = new Ami;
    return (new Instance).listInstances([{ Name: 'tag:Backup', Values: ['yes'] }])
        .then(instances => ami.createImages(instances, suffix))
        .then(images => ami.createTags(images))
        .then(() => ami.listExpiredImages())
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

const postError = (message) => {
    let username = env.name.createAmi;
    let icon = env.icon.createAmi;
    return (new Http).postSlack(message, username, icon, '#monitor', true);
};

exports.handler = (event, context, callback) => {

    console.log('event', JSON.stringify(event));

    let log = 'Lambda CreateAmi action.';
    callback(null, log);

    run(event).then((data) => {
        log = JSON.stringify(data);
        console.log(log);
        callback(null, log);
        context.succeed(log);
    }).catch((e) => {
        log = JSON.stringify(e);
        console.log(log);
        postError(log).then((data) => {
            callback(e, log);
            context.fail(log);
        });
    });

};
