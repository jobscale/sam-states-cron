const { Ami } = require('./services/ami');
const { Instance } = require('./services/instance');

const env = {};
const createAndRemoveAmi = () => {
  /**
     * Lambda function: create AMIs and delete expired AMIs
     */
  const ami = new Ami();
  return (new Instance()).listInstances([{ Name: 'tag:Backup', Values: ['yes'] }])
  .then(instances => ami.createImages(instances))
  .then(images => ami.createTags(images))
  .then(() => ami.listExpiredImages(env.AMI.RETENTION_PERIOD))
  .then(images => ami.deleteImages(images))
  .then(mappings => ami.deleteSnapshots(mappings));
};
module.exports = {
  createAndRemoveAmi,
};
