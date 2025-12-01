import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const logger = console;
const TableName = 'develop-app-AutoscalingSample';

const maxAttempts = 20;
const ddb = new DynamoDBClient({ maxAttempts, logger });

const scanAll = async ({ params, items }) => {
  if (!items) items = [];
  if (!params) {
    params = {
      TableName,
      ProjectionExpression: '#uuid',
      ExpressionAttributeNames: { '#uuid': 'uuid' },
    };
  }
  const data = await ddb.send(new ScanCommand(params));
  items.push(...data.Items.map(item => unmarshall(item)));
  if (!data.LastEvaluatedKey) return items;
  params.ExclusiveStartKey = data.LastEvaluatedKey;
  return scanAll({ params, items });
};

const getAll = async () => {
  const start = Date.now();
  const items = await scanAll({});
  items.map(item => logger.info(JSON.stringify(item)));
  logger.info({ Total: items.length, Duration: (Date.now() - start) / 1000 });
};

getAll();

export { getAll };
