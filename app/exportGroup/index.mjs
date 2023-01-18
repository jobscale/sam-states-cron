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
    relation.statusText = statusText;
    relation.completed = (parseInt(relation.completed, 10) || 0) + (statusText === 'COMPLETED' ? 1 : 0);
    relation.logGroup.seconds = dayjs().unix() - relation.logGroup.begin;
    relation.logGroup.minutes = Math.floor(relation.logGroup.seconds / 6) / 10;
    return relation;
  });
};

const createTask = async relation => {
  if (!relation.list.length) {
    delete relation.logGroup;
    return {
      ...relation,
      statusText: 'SUCCEEDED',
    };
  }
  const { from, to } = relation;
  const [logGroupName] = relation.list;
  const [date] = from.split('T');
  const destinationPrefix = `export/${logGroupName}/${date}`.replace(/\/\//g, '/');
  const params = {
    logGroupName,
    destination: DESTINATION,
    destinationPrefix,
    from: dayjs(from).valueOf(),
    to: dayjs(to).valueOf(),
  };
  const command = new CreateExportTaskCommand(params);
  return await client.send(command)
  .then(data => {
    relation.list.shift();
    return {
      ...relation,
      logGroup: {
        name: logGroupName,
        begin: dayjs().unix(),
      },
      statusText: 'RUNNING',
      taskId: data.taskId,
    };
  })
  .catch(e => {
    logger.warn(e.toString());
    if (e.message.match('Please make sure the values are within the retention period of the log groups and from value is lesser than the to value')) {
      relation.list.shift();
      return {
        ...relation,
        statusText: 'COMPLETED',
      };
    }
    if (e.toString() === 'LimitExceededException: Resource limit exceeded.') {
      return {
        ...relation,
        statusText: 'LIMIT',
        retry: (parseInt(relation.retry, 10) || 0) + 1,
      };
    }
    if (e.toString() === 'ThrottlingException: Rate exceeded') {
      return {
        ...relation,
        statusText: 'RATE',
        retry: (parseInt(relation.retry, 10) || 0) + 1,
      };
    }
    throw e;
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
