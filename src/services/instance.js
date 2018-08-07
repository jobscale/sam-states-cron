'use strict';

const AWS = require('aws-sdk');
const ec2 = new AWS.EC2();

export class Instance {

    /**
     * List EC2 instances
     * @return {Promise.<Array>} instances
     */
    listInstances = (filters = [{ Name: 'tag:Backup', Values: ['yes'] }]) => {
        console.log('listInstances');

        // describeInstances
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-property
        return ec2.describeInstances({
            Filters: filters,
        }).promise()
            .then((data) => {
                return data.Reservations.length === 0 ? data.Reservations : data.Reservations
                    .map(reservation => reservation.Instances.map(instance => ({
                        InstanceId: instance.InstanceId,
                        Tags: instance.Tags
                    })))
                    .reduce((previousValue, currentValue) => previousValue.concat(currentValue));
            });
    };

}
