const { logger } = require('@jobscale/logger');
const { createAndRemoveAmi } = require('./createAndRemoveAmi');

exports.handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));
  return createAndRemoveAmi()
  .then(response => {
    return {
      statusCode: 200,
      body: JSON.stringify({ response }),
    };
  })
  .catch(e => {
    logger.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({ e }),
    };
  });
};

if (process.env.NODE_LOCAL) {
  const loader = require;
  module.exports.handler(loader('./event.json'))
  .catch(e => logger.error(e))
  .then(response => {
    logger.info('RESPONSE', JSON.stringify(response, null, 2));
    process.exit();
  });
}
