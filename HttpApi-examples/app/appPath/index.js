import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const logger = console;

const { FunctionName } = process.env;
const lambda = new LambdaClient();

const invoke = async payload => lambda.send(new InvokeCommand({
  FunctionName,
  Payload: JSON.stringify(payload),
  InvocationType: 'Event',
  LogType: 'Tail',
}));

const main = async event => ({
  ts: Date.now(),
  ...await invoke(event.body),
});

export const handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));

  return main(event)
  .then(res => ({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(res),
  }))
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
