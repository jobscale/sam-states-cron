const logger = console;
export const handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      date: new Date(),
      message: 'ok',
    }),
  };
  logger.info('RESPONSE', JSON.stringify(response, null, 2));
  return response;
};
