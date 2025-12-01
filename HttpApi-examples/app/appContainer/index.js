Error.stackTraceLimit = 20;
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const { ENV } = process.env;
const logger = console;
const TableName = `${ENV}-app-AutoscalingSample`;

const maxAttempts = 20;
const ddb = new DynamoDBClient({ maxAttempts, logger });

const parse = async text => JSON.parse(
  text[0] === '{' ? text : Buffer.from(text, 'base64').toString(),
);

class App {
  async tryWrite({ prefix, count }) {
    const bytes = 492;
    const buffer = [];
    for (let i = 0; i < bytes; i++) {
      buffer.push(Math.floor(Math.random() * 0xff));
    }
    const body = `0x${Buffer.from(buffer).toString('hex')}`;
    logger.info({ bytes: JSON.stringify(marshall({ uuid: 'nnnn', body })).length });

    const pending = [];
    for (let i = 0; i < count; i++) {
      const uuid = `${prefix}-${i}`;
      pending.push(
        ddb.send(new PutItemCommand({ TableName, Item: marshall({ uuid, body }) })),
      );
    }
    return Promise.allSettled(pending)
    .then(settledList => {
      const fulfilled = settledList.filter(settled => settled.status === 'fulfilled');
      const succeeded = fulfilled.filter(settled => settled.value);
      return {
        Total: pending.length,
        Fulfilled: fulfilled.length,
        Succeeded: succeeded.length,
        Bugs: fulfilled.length - succeeded.length,
        Failed: pending.length - fulfilled.length,
      };
    });
  }

  async tryRead({ prefix, count }) {
    const pending = [];
    for (let i = 0; i < count; i++) {
      const uuid = `${prefix}-${i}`;
      pending.push(
        ddb.send(new GetItemCommand({ TableName, Key: marshall({ uuid }) })),
      );
    }
    return Promise.allSettled(pending)
    .then(settledList => {
      const fulfilled = settledList.filter(settled => settled.status === 'fulfilled');
      const succeeded = fulfilled.filter(settled => settled.value);
      return {
        Total: pending.length,
        Fulfilled: fulfilled.length,
        Succeeded: succeeded.length,
        Bugs: fulfilled.length - succeeded.length,
        Failed: pending.length - fulfilled.length,
      };
    });
  }

  async main(event) {
    const { type, prefix, count } = await parse(event.body ? event.body : event);
    if (type === 'write') return this.tryWrite({ prefix, count });
    if (type === 'read') return this.tryRead({ prefix, count });
    throw new Error('no supported');
  }
}

export const handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));

  return new App().main(event)
  .then(res => ({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(res),
  }))
  .catch(e => ({
    statusCode: 503,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ type: e.name, error: e.message }),
  }))
  .then(response => {
    logger.info('RESPONSE', JSON.stringify(response, null, 2));
    return response;
  });
};
