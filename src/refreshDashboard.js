

import { Dashboard } from './services/dashboard';
import { Http } from './services/http';
import { Util } from './services/util';

const _ = require('lodash');


const AWS = require('aws-sdk');


const co = require('co');
const env = require('./env.json');

const refreshDashboard = () => {
  const dashboards = (new Dashboard()).getDashboards();


  const cloudwatchClient = new AWS.CloudWatch();


  let dashboard;


  let dashboardContext;

  const main = function* () {
    for (let i = 0; i < dashboards.length; i++) {
      dashboard = dashboards[i];
      dashboardContext = { dashboard };
      if (dashboard.dashboardName) {
        const dashboardResponse = yield cloudwatchClient.getDashboard({ DashboardName: dashboard.dashboardName }).promise();


        const dashboardBody = JSON.parse(dashboardResponse.DashboardBody);

        yield (new Dashboard()).updateDashboard(cloudwatchClient, dashboardContext, dashboardBody);
      }
    }
  };

  co(main);
};

const run = (event) => new Promise((resolve, reject) => {
  try {
    refreshDashboard();
    resolve(null);
  } catch (e) {
    reject(e);
  }
});

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
    (new Http()).postError(log).then((data) => {
      callback(e, log);
      context.fail(log);
    });
  });
};
