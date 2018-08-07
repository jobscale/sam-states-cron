

import { Http } from './services/http';
import { Util } from './services/util';

const env = require('./env.json');

const prefix = 'web';

const run = (event) => Promise.all(event.Records.map((record) => {
  const sns = record.Sns;
  const subject = sns.Subject;
  const message = JSON.parse(sns.Message);
  const service = message.Service;
  const string = message.Description;
  const fail = string.match(/fail/);
  const channel = fail ? '#alert' : env.channel.autoScaling;
  const icon = fail ? ':fire:' : env.icon.autoScaling;
  return (new Http()).postSlack(`${prefix}: ${subject} ${string}`, service, icon, channel, true);
}));

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
