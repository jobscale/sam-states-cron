'use strict';

const env = require('../env.json');
const AWS = require('aws-sdk');
const Http = require('../services/http');

const ec2 = new AWS.EC2();

export class Ami {

    /**
     * Create AMIs
     * @param {Array} instances
     * @returns {Promise.<Array>} AMIs
     */
    createImages = (instances) => {
        console.log('createImages target instances =', JSON.stringify(instances));

        return Promise.all(instances.map((instance) => {
            const name = instance.Tags.some((tag) => {
                return tag.Key === 'Name';
            }) ? instance.Tags.find((tag) => {
                return tag.Key === 'Name';
            }).Value : instance.InstanceId;

            let now = new Date();
            let amiName = `${name} on ${now.toDateString()} ${now.getHours()}`;

            let message = `createAMI '${amiName}' ${process.env.AWS_REGION}`;
            let username = 'create-snapshot';
            let icon = env.icon.createAmi;
            let channel = env.channel.createAmi;

            console.log(message);
            (new Http).postSlack(message, username, icon, channel, true).then(() => {
                console.log(`'${amiName}' posted slack.`);
            });

            // createImage
            // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createImage-property
            return ec2.createImage({
                InstanceId: instance.InstanceId,
                NoReboot: true,
                Tags: instance.Tags
            }).promise();
        }));
    };

    /**
     * Create Tags
     * @param {Array} images - AMIs
     * @returns {Promise.<Array>} null
     */
    createTags = (images) => {
        console.log('createTags target images =', JSON.stringify(images));

        // createTags
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createTags-property
        return Promise.all(images.map(image => ec2.createTags({
            Resources: [image.ImageId],
            Tags: [
                {Key: 'Name', Value: image.ImageId},
                {Key: 'Delete', Value: 'yes'}
            ],
        }).promise()));
    };

    /**
     * List expired AMIs
     * @return {Promise.<Array>} AMIs
     */
    listExpiredImages = (retentionPeriod = 1) => {
        console.log('listExpiredImages');

        // describeImages
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeImages-property
        return ec2.describeImages({
            Owners: ['self'],
            Filters: [{ Name: 'tag:Delete', Values: ['yes'] }],
        }).promise()
            .then((data) => {
                return data.Images
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
                    }));
            });
    };

    /**
     * Delete AMIs
     * @param {Array} images - AMIs
     * @returns {Promise.<Array>} block device mappings
     */
    deleteImages = (images) => {
        console.log('deleteImages target images =', JSON.stringify(images));

        // deregisterImage
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeImages-property
        return Promise.all(images.map(image => ec2.deregisterImage({
            ImageId: image.ImageId,
        }).promise()))
            .then(() => {
                return images.length === 0 ? images : images
                    .map(image => image.BlockDeviceMappings)
                    .reduce((previousValue, currentValue) => previousValue.concat(currentValue));
            });
    };

    /**
     * Delete Snapshots
     * @param {Array} mappings - block device mappings
     * @returns {Promise.<Array>} null
     */
    deleteSnapshots = (mappings) => {
        console.log('deleteSnapshots target mappings =', JSON.stringify(mappings));

        // deleteSnapshot
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteSnapshot-property
        return Promise.all(mappings.map(mapping => ec2.deleteSnapshot({
            SnapshotId: mapping.Ebs.SnapshotId,
        }).promise()));
    };

}
