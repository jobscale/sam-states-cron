'use strict';

const env = require('./env.json');

import {Dashboard} from "./services/dashboard";
import {Http} from "./services/http";
import {Util} from "./services/util";

const _ = require('lodash'),
    AWS = require('aws-sdk'),
    co = require('co');

const refreshDashboard = () => {
    let dashboards = (new Dashboard).getDashboards(),
        cloudwatchClient = new AWS.CloudWatch(),
        dashboard,
        dashboardContext;

    let main = function* () {
        for (let i = 0; i < dashboards.length; i++) {
            dashboard = dashboards[i];
            dashboardContext = { dashboard: dashboard };
            if (dashboard.dashboardName) {
                let dashboardResponse = yield cloudwatchClient.getDashboard({
                        DashboardName: dashboard.dashboardName }).promise(),
                    dashboardBody = JSON.parse(dashboardResponse.DashboardBody);

                yield (new Dashboard).updateDashboard(cloudwatchClient, dashboardContext, dashboardBody);
            }
        }
    };

    co(main);
};

const run = (event) => {
    return new Promise((resolve, reject) => {
        try {
            refreshDashboard();
            resolve(null);
        } catch (e) {
            reject(e);
        }
    });
};

exports.handler = (event, context, callback) => {

    console.log('event', JSON.stringify(event));

    let log = Util.init('Lambda RefreshDashboard');
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
