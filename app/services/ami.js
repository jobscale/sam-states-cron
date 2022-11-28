const AWS = require('aws-sdk');
const dayjs = require('dayjs');
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
      if (!data.Reservations.length) return [];
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
    const now = new Date();
    return Promise.all(instances.map(instance => {
      const name = instance.Tags.some(tag => tag.Key === 'Name')
        ? instance.Tags.find(tag => tag.Key === 'Name').Value
        : instance.InstanceId;
      const amiName = `${name} on ${now.toISOString()}`.replace(/[:.]/g, ' ');
      return [name, {
        InstanceId: instance.InstanceId,
        Name: amiName,
        NoReboot: true,
      }];
    }))
    .then(images => {
      logger.info('createImages', JSON.stringify(images, null, 2));
      return Promise.all(images.map(([name, params]) => {
        // createImage
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createImage-property
        return ec2.createImage(params).promise()
        .then(image => this.createTags({ ...image, name }));
      }));
    });
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
  listExpiredImages(retentionPeriod = 3) {
    const params = {
      Owners: ['self'],
      Filters: [{ Name: 'tag:Delete', Values: ['yes'] }],
    };
    // describeImages
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeImages-property
    return ec2.describeImages(params).promise()
    .then(({ Images }) => {
      // filter expired
      const expirationDate = dayjs().subtract(retentionPeriod, 'days');
      return Images.filter(image => dayjs(image.CreationDate) < expirationDate);
    })
    .then(expired => {
      return expired.map(image => ({
        ImageId: image.ImageId,
        CreationDate: image.CreationDate,
        BlockDeviceMappings: image.BlockDeviceMappings
        .filter(mapping => mapping.Ebs)
        .map(mapping => ({
          Ebs: { SnapshotId: mapping.Ebs.SnapshotId },
        })),
      }));
    });
  }

  /**
   * Deregister AMIs
   * @param {Array} images - AMIs
   * @returns {Promise.<Array>} block device mappings
   */
  deregisterImages(images) {
    logger.info('deregisterImage', JSON.stringify(images, null, 2));
    return Promise.all(images.map(image => {
      const params = {
        ImageId: image.ImageId,
      };
      // deregisterImage
      // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeImages-property
      return ec2.deregisterImage(params).promise();
    }))
    .then(() => {
      return images.map(image => image.BlockDeviceMappings).flat();
    });
  }

  /**
   * Delete Snapshots
   * @param {Array} mappings - block device mappings
   * @returns {Promise.<Array>} null
   */
  deleteSnapshots(mappings) {
    logger.info('deleteSnapshot', JSON.stringify(mappings, null, 2));
    return Promise.all(mappings.map(({ Ebs }) => {
      if (!Ebs.SnapshotId) return undefined;
      const params = {
        SnapshotId: Ebs.SnapshotId,
      };
      // deleteSnapshot
      // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteSnapshot-property
      return ec2.deleteSnapshot(params).promise()
      .then(() => params);
    }));
  }
}

module.exports = {
  Ami,
};
