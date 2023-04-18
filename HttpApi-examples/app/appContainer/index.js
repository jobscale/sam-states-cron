const logger = console;

const main = async event => {
  return { message: 'ok' };
};

exports.handler = async event => {
  logger.info('EVENT', JSON.stringify(event));

  return main(event)
  .then(res => {
    return {
      statusCode: 200,
      headers: { 'Content-Length': 'application/json' },
      body: JSON.stringify(res),
    };
  })
  .catch(e => {
    logger.error(e);
    return {
      statusCode: 503,
      headers: { 'Content-Length': 'application/json' },
      body: JSON.stringify({ message: e.message }),
    };
  })
  .then(response => {
    logger.info('RESPONSE', JSON.stringify(response));
    return response;
  });
};
