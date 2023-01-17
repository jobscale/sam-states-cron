import logger from '@jobscale/logger';
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import dayjs from 'dayjs';
import localEvent from './event.json' assert { type: 'json' };

const client = new CloudWatchLogsClient();

const listGroups = async (params, before) => {
  const command = new DescribeLogGroupsCommand(params);
  return client.send(command)
  .then(data => {
    const list = [...(before || []), ...data.logGroups];
    if (data.nextToken) {
      params.nextToken = data.nextToken;
      return listGroups(params, list);
    }
    logger.info({ listTotal: list.length });
    return {
      list: list.filter(item => {
        if (item.logGroupName.match('amplify')) return false;
        if (item.logGroupName.match('kinesis')) return false;
        return true;
      })
      .map(item => item.logGroupName),
      statusText: 'SUCCEEDED',
    };
  });
};

export const handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));
  const result = await listGroups({ limit: 50 })
  .then(relation => {
    const from = dayjs(event.time).subtract(1, 'days').startOf('day').toISOString().replace('Z', '+0900');
    const to = dayjs(from).add(1, 'days').add(9, 'hours').toISOString().replace('Z', '+0900');
    return {
      from,
      to,
      ...relation,
      ts: dayjs().add(9, 'hours').toISOString().replace('Z', '+0900'),
    };
  })
  .catch(e => {
    logger.error(e);
    return {
      ts: dayjs().add(9, 'hours').toISOString().replace('Z', '+0900'),
      statusText: 'FAILED',
    };
  });
  logger.info("RESULT", JSON.stringify(result, null, 2));
  return result;
};

if (process.env.LOCAL_EXECUTE) {
  handler(localEvent);
}
