const { Ami } = require('./services/ami');

const { AMI_RETENTION_PERIOD } = process.env;

const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });

const createAndRemoveAmi = () => {
  const ami = new Ami();
  return ami.listInstances([{ Name: 'tag:Backup', Values: ['yes'] }])
  .then(instances => ami.createImages(instances))
  .then(() => wait(5000))
  .then(() => ami.listExpiredImages(AMI_RETENTION_PERIOD))
  .then(images => ami.deregisterImages(images))
  .then(mappings => ami.deleteSnapshots(mappings));
};

module.exports = {
  createAndRemoveAmi,
};
