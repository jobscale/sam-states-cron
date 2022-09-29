const AWS = require('aws-sdk');
const { logger } = require('@jobscale/logger');

const ec2 = new AWS.EC2();
class Ami {
  /**
   * List EC2 instances
   * @return {Promise.<Array>} instances
   */
  listInstances(filters = [{ Name: 'tag:Backup', Values: ['yes'] }]) {
    const params = {
      Filters: filters,
    };
    // describeInstances
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-property
    return ec2.describeInstances(params).promise()
    .then(data => {
      return data.Reservations
      .map(reservation => {
        return reservation.Instances.map(instance => ({
          InstanceId: instance.InstanceId,
          Tags: instance.Tags,
        }));
      })
      .reduce((previousValue, currentValue) => previousValue.concat(currentValue));
    });
  }

  /**
   * Create AMIs
   * @param {Array} instances
   * @returns {Promise.<Array>} AMIs
   */
  createImages(instances) {
    logger.info('createImages', JSON.stringify(instances.map(instance => instance.InstanceId), null, 2));
    const now = new Date();
    return Promise.all(instances.map(instance => {
      const name = instance.Tags.some(tag => tag.Key === 'Name')
        ? instance.Tags.find(tag => tag.Key === 'Name').Value
        : instance.InstanceId;
      const amiName = `${name} on ${now.toISOString()}`.split(/[:.]/g, ' ');
      const params = {
        InstanceId: instance.InstanceId,
        Name: amiName,
        NoReboot: true,
      };
      // createImage
      // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createImage-property
      return ec2.createImage(params).promise()
      .then(image => {
        this.createTags({ ...image, name });
      });
    }));
  }

  /**
   * Create Tags
   * @param {Array} images - AMIs
   * @returns {Promise.<Array>} null
   */
  createTags(image) {
    const params = {
      Resources: [image.ImageId],
      Tags: [
        { Key: 'Name', Value: image.name },
        { Key: 'Delete', Value: 'yes' },
      ],
    };
    // createTags
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createTags-property
    return ec2.createTags(params).promise();
  }

  /**
   * List expired AMIs
   * @return {Promise.<Array>} AMIs
   */
  listExpiredImages(retentionPeriod = 1) {
    const params = {
      Owners: ['self'],
      Filters: [{ Name: 'tag:Delete', Values: ['yes'] }],
    };
    // describeImages
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeImages-property
    return ec2.describeImages(params).promise()
    .then(({ Images }) => {
      // filter expired
      const DAY = 86400000;
      const expirationDate = new Date(Date.now() - (retentionPeriod * DAY));
      return Images.filter(image => new Date(image.CreationDate) < expirationDate);
    })
    .then(expired => {
      return expired.map(image => ({
        ImageId: image.ImageId,
        CreationDate: image.CreationDate,
        BlockDeviceMappings: image.BlockDeviceMappings.map(mapping => ({
          Ebs: { SnapshotId: mapping.Ebs.SnapshotId },
        })),
      }));
    });
  }

  /**
   * Delete AMIs
   * @param {Array} images - AMIs
   * @returns {Promise.<Array>} block device mappings
   */
  deleteImages(images) {
    // deregisterImage
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeImages-property
    return Promise.all(images.map(image => {
      return ec2.deregisterImage({
        ImageId: image.ImageId,
      }).promise();
    }))
    .then(() => {
      return images.map(image => image.BlockDeviceMappings)
      .reduce((previousValue, currentValue) => previousValue.concat(currentValue));
    });
  }

  /**
   * Delete Snapshots
   * @param {Array} mappings - block device mappings
   * @returns {Promise.<Array>} null
   */
  deleteSnapshots(mappings) {
    return Promise.all(mappings.map(({ Ebs }) => {
      const params = {
        SnapshotId: Ebs.SnapshotId,
      };
      // deleteSnapshot
      // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteSnapshot-property
      return ec2.deleteSnapshot(params).promise();
    }));
  }
}

module.exports = {
  Ami,
};
