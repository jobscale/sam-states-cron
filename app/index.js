const { Ami } = require('./services/ami');

const { env } = process;
const createAndRemoveAmi = () => {
  const ami = new Ami();
  return ami.listInstances([{ Name: 'tag:Backup', Values: ['yes'] }])
  .then(instances => ami.createImages(instances))
  .then(() => ami.listExpiredImages(env.AMI_RETENTION_PERIOD))
  .then(images => ami.deleteImages(images))
  .then(mappings => ami.deleteSnapshots(mappings));
};

module.exports = {
  createAndRemoveAmi,
};
