const { Ami } = require('./services/ami');

const { env } = process;

const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });

const createAndRemoveAmi = () => {
  const ami = new Ami();
  return ami.listInstances([{ Name: 'tag:Backup', Values: ['yes'] }])
  .then(instances => ami.createImages(instances))
  .then(() => wait(5000))
  .then(() => ami.listExpiredImages(env.AMI_RETENTION_PERIOD))
  .then(images => ami.deregisterImages(images))
  .then(mappings => ami.deleteSnapshots(mappings));
};

module.exports = {
  createAndRemoveAmi,
};
