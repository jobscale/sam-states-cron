const logger = console;
const a = [
  [{ a: 1 }, { b: 1 }],
];
const b = [...a, ...a, ...a];
logger.info('b', b);
const c = b.reduce((previousValue, currentValue) => previousValue.concat(currentValue));
logger.info('c', c);
