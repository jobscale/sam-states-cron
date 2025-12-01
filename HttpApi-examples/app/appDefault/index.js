const logger = console;

export const handler = async event => {
  logger.info(event);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'OK' }),
  };
};
