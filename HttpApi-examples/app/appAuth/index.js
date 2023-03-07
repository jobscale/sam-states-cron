const logger = console;
exports.handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));
  const [token] = event.identitySource;
  const response =  {
    isAuthorized: token === 'ABC123',
    context: {
        principalId: token,
        source: "Auth0",
    },
  };
  logger.info('RESPONSE', JSON.stringify(response, null, 2));
  return response;
};
