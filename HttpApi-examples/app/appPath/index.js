const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const logger = console;

const { FunctionName } = process.env;
const lambda = new LambdaClient();

const invoke = async payload => {
  return lambda.send(new InvokeCommand({
    FunctionName,
    Payload: JSON.stringify(payload),
    InvocationType: 'Event',
    LogType: 'Tail',
  }));
};

const main = async event => {
  return {
    ts: Date.now(),
    ...await invoke(event.body),
  };
};

exports.handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));

  return main(event)
  .then(res => {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(res),
    };
  })
  .catch(e => {
    logger.error(e);
    return {
      statusCode: e.statusCode || 503,
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ error: e.name }),
    };
  })
  .then(response => {
    logger.info('RESPONSE', JSON.stringify(response, null, 2));
    return response;
  });
};
