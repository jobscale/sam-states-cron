'use strict';

const env = require('../env.json');

const _ = require('lodash'),
    AWS = require('aws-sdk'),

    EC2_NAMESPACE = 'AWS/EC2',
    INSTANCE_ID_DIM = 'InstanceId',
    REPEAT_PREVIOUS = '...',
    NAME_TAG = 'Name',
    METRIC_WIDGET_TYPE = 'metric';

export class Dashboard {

    getDashboards = () => {
        let dashboardDef = JSON.parse(env.AWS_DASHBOARDS),
            dashboards;

        if (! dashboardDef) {
            throw 'Environment variable AWS_DASHBOARDS is not set. It should be set with JSON array, e.g [{"dashboardName": "myDashboard"}]';
        }

        try {
            dashboards = JSON.parse(dashboardDef);
        } catch (err) {
            throw 'Error, AWS_DASHBOARDS is not valid JSON';
        }

        if (! Array.isArray(dashboards)) {
            throw 'Expecting AWS_DASHBOARDS to be an array';
        }
        return dashboards;
    };

    ec2MetricsFromDescribeInstances = (ec2DescribeInstances, metricName) => {
        return _.chain(ec2DescribeInstances.Reservations).
        map('Instances').
        flatten().
        map(function(instance) {
            let idAndLabel = {
                id: instance.InstanceId,
                label: instance.InstanceId
            };
            _.each(instance.Tags, (tag) => {        // Use Name tag instead of InstanceId as label, if it exists
                if (tag.Key === NAME_TAG) {
                    idAndLabel.label = tag.Value;
                    return false;
                }
            });
            return idAndLabel;
        }).
        sortBy(['label']).
        map((idAndLabel, i) => {

            let metric = i == 0 ?
                [ EC2_NAMESPACE, metricName, INSTANCE_ID_DIM, idAndLabel.id ] :
                [ REPEAT_PREVIOUS, idAndLabel.id ];

            if (idAndLabel.id != idAndLabel.label) {
                metric.push({label: idAndLabel.label});
            }
            return metric;
        }).
        value();
    };

    getEC2Metrics = function* (dashboardContext, region, metricName) {
        let params = dashboardContext.dashboard.ec2DescribeInstanceParams || {},
            ec2Cache = dashboardContext.ec2Cache,
            ec2DescribeInstances;

        // ec2Cache is a cache of instance responses per region for the current dashboard, to limit calls to EC2
        if (!ec2Cache) {
            dashboardContext.ec2Cache = {};
        } else if (ec2Cache[region]) {
            ec2DescribeInstances = ec2Cache[region];
        }

        if (!ec2DescribeInstances) {
            // Not in cache, call EC2 to get list of regions
            let ec2Client = new AWS.EC2({region: region});
            ec2DescribeInstances = yield ec2Client.describeInstances(params).promise(),
                dashboardContext.ec2Cache[region] = ec2DescribeInstances;
        }

        return this.ec2MetricsFromDescribeInstances(ec2DescribeInstances, metricName);
    };

    updateDashboard = function* (cloudwatchClient, dashboardContext, dashboardBody) {
        let newDashboard = _.cloneDeep(dashboardBody),
            widgets = newDashboard.widgets,
            dashboardName = dashboardContext.dashboard.dashboardName;

        for (let i = 0; i < widgets.length; i++) {
            let widget = widgets[i],
                metrics = widget.properties.metrics,
                region = widget.region;

            // Check to see if it's a metric widget and first metric is an EC2 Instance metric
            if (widget.type === METRIC_WIDGET_TYPE && metrics && (metrics[0].length === 4 || metrics[0].length === 5) &&
                metrics[0][0] === EC2_NAMESPACE && metrics[0][2] === INSTANCE_ID_DIM) {
                widget.properties.metrics = yield this.getEC2Metrics(dashboardContext, region, metrics[0][1]);
            }
        }

        if (JSON.stringify(dashboardBody) !== JSON.stringify(newDashboard)) {
            console.log(`Updating dashboard ${dashboardName} to:`, JSON.stringify(newDashboard));

            // Save updated dashboard
            yield cloudwatchClient.putDashboard({
                DashboardName: dashboardName,
                DashboardBody: JSON.stringify(newDashboard)
            }).promise();
        } else {
            console.log(`Dashboard ${dashboardName} is unchanged, update skipped`);
        }
    };

}
