import logger from '@jobscale/logger';
import {
  CloudWatchLogsClient, CreateExportTaskCommand, DescribeExportTasksCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import dayjs from 'dayjs';
import localEvent from './event.json' assert { type: 'json' };

const DESTINATION = 'sam-states-cron';
const client = new CloudWatchLogsClient();

const describeTask = async relation => {
  const command = new DescribeExportTasksCommand({ taskId: relation.taskId });
  return await client.send(command)
  .then(data => {
    const [{ status: { code: statusText } }] = data.exportTasks;
    return {
      ...relation,
      statusText,
    };
  });
};

const createTask = async relation => {
  if (!relation.list.length) {
    return {
      statusText: 'SUCCEEDED',
    };
  }
  const logGroupName = relation.list.shift();
  const start = dayjs().subtract(1, 'days').startOf('day').toISOString().replace('Z', '+0900');
  const from = dayjs(start).valueOf();
  const to = dayjs(from).add(1, 'days').valueOf();
  const [date] = dayjs(from).toISOString().split('T');
  const destinationPrefix = `export/${logGroupName}/${date}`.replace(/\/\//g, '/');
  const params = {
    logGroupName,
    destination: DESTINATION,
    destinationPrefix,
    from,
    to,
  };
  logger.info({ from: dayjs(from).add(9, 'hours').toISOString().replace('Z', '+0900') });
  const command = new CreateExportTaskCommand(params);
  return await client.send(command)
  .then(data => {
    return {
      ...relation,
      statusText: 'RUNNING',
      taskId: data.taskId,
    };
  });
};

const controlTask = async relation => {
  if (relation.statusText === 'RUNNING') {
    return describeTask(relation);
  }
  return createTask(relation);
};

export const handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));
  const result = await controlTask(event.relation)
  .then(relation => {
    return {
      ...relation,
      ts: dayjs().add(9, 'hours').toISOString().replace('Z', '+0900'),
    };
  })
  .catch(e => {
    logger.error(e.message);
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
