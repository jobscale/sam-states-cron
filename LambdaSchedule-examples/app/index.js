import fs from 'fs';
import { logger } from '@jobscale/logger';
import { createAndRemoveAmi } from './createAndRemoveAmi.js';

export const handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));
  return createAndRemoveAmi()
  .then(response => ({
    statusCode: 200,
    body: JSON.stringify({ response }),
  }))
  .catch(e => {
    logger.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({ e }),
    };
  });
};

if (process.env.NODE_LOCAL) {
  const localEvent = JSON.parse(fs.readFileSync('./event.json', 'utf-8'));
  handler(localEvent)
  .catch(e => logger.error(e))
  .then(response => {
    logger.info('RESPONSE', JSON.stringify(response, null, 2));
    process.exit();
  });
}
