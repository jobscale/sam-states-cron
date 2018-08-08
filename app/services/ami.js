const AWS = require('aws-sdk');

const ec2 = new AWS.EC2();
class Ami {
  /**
   * Create AMIs
   * @param {Array} instances
   * @returns {Promise.<Array>} AMIs
   */
  createImages(instances) {
    return Promise.all(instances.map((instance) => {
      const name = instance.Tags.some((tag) => tag.Key === 'Name') ? instance.Tags.find((tag) => tag.Key === 'Name').Value : instance.InstanceId;
      const now = new Date();
      const amiName = `${name} on ${now.toDateString()} ${now.getHours()}`;
      // createImage
      // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createImage-property
      return ec2.createImage({
        InstanceId: instance.InstanceId,
        Name: amiName,
        NoReboot: true,
      }).promise();
    }));
  }

  /**
   * Create Tags
   * @param {Array} images - AMIs
   * @returns {Promise.<Array>} null
   */
  createTags(images) {
    // createTags
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createTags-property
    return Promise.all(images.map(image => ec2.createTags({
      Resources: [image.ImageId],
      Tags: [
        { Key: 'Name', Value: image.ImageId },
        { Key: 'Delete', Value: 'yes' },
      ],
    }).promise()));
  }

  /**
   * List expired AMIs
   * @return {Promise.<Array>} AMIs
   */
  listExpiredImages(retentionPeriod = 1) {
    // describeImages
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeImages-property
    return ec2.describeImages({
      Owners: ['self'],
      Filters: [{ Name: 'tag:Delete', Values: ['yes'] }],
    }).promise()
    .then((data) => data.Images
    .filter((image) => {
      const creationDate = new Date(image.CreationDate);
      const expirationDate = new Date(Date.now() - (86400000 * retentionPeriod));
      return creationDate < expirationDate;
    })
    .map(image => ({
      ImageId: image.ImageId,
      CreationDate: image.CreationDate,
      BlockDeviceMappings: image.BlockDeviceMappings.map(mapping => ({
        Ebs: { SnapshotId: mapping.Ebs.SnapshotId },
      })),
    })));
  }

  /**
   * Delete AMIs
   * @param {Array} images - AMIs
   * @returns {Promise.<Array>} block device mappings
   */
  deleteImages(images) {
    // deregisterImage
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeImages-property
    return Promise.all(images.map(image => ec2.deregisterImage({
      ImageId: image.ImageId,
    }).promise()))
    .then(() => images.length === 0 ? images : images
    .map(image => image.BlockDeviceMappings)
    .reduce((previousValue, currentValue) => previousValue.concat(currentValue)));
  }

  /**
   * Delete Snapshots
   * @param {Array} mappings - block device mappings
   * @returns {Promise.<Array>} null
   */
  deleteSnapshots(mappings) {
    // deleteSnapshot
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteSnapshot-property
    return Promise.all(mappings.map(mapping => ec2.deleteSnapshot({
      SnapshotId: mapping.Ebs.SnapshotId,
    }).promise()));
  }
}
module.exports = {
  Ami,
};
