

import { Http } from './services/http';
import { Util } from './services/util';

const env = require('./env.json');

const joinNameValue = (json) => {
  if (!json || !json.length) {
    return '';
  }
  const array = [];
  json.forEach((item, key) => {
    array.push(`${item.name}:${item.value}`);
  });
  return array.join(',');
};

const run = (event) => {
  const name = env.name.alert;
  const icon = env.icon.alert;
  const channel = env.channel.alert;
  const http = new Http();
  return Promise.all((event.Records || []).map((rec) => {
    if (!rec.Sns) {
      return null;
    }
    const sns = JSON.parse(rec.Sns.Message);
    let status = sns.NewStateValue;
    if (status === 'ALARM') {
      status = `:exclamation: ${status}`;
    }
    if (status === 'OK') {
      status = `:white_check_mark: ${status}`;
    }
    const trigger = sns.Trigger || {};
    const message = `${trigger.Namespace}: ${joinNameValue(trigger.Dimensions)}: ${trigger.MetricName}\n`
            + `*${status}: ${sns.AlarmDescription}*\n${
              sns.NewStateReason}`;
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

  let log = Util.init('Lambda Alert');
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
