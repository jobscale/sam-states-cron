

import { Http } from './services/http';
import { Util } from './services/util';

const env = require('./env.json');

const run = (event) => Promise.all(event.Records.map((record) => {
  const msg = JSON.parse(record.Sns.Message);
  return new Promise((resolve, reject) => {
    (new Http()).request(env.url.scaleIn, msg.EC2InstanceId, 'POST', 'http', 'text/plain').then((data) => {
      console.log('fin request');
      resolve(data);
    }).catch((e) => {
      console.log('abort request');
      resolve(e);
    });
  });
}));

exports.handler = (event, context, callback) => {
  console.log('event', JSON.stringify(event));

  let log = Util.init('Lambda AutoScaling ScaleIn');
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
