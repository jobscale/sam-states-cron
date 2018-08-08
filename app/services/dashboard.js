const _ = require('lodash');
const AWS = require('aws-sdk');

const env = {};
const EC2_NAMESPACE = 'AWS/EC2';
const INSTANCE_ID_DIM = 'InstanceId';
const REPEAT_PREVIOUS = '...';
const NAME_TAG = 'Name';
const METRIC_WIDGET_TYPE = 'metric';
class Dashboard {
  getDashboards() {
    const dashboardDef = JSON.parse(env.AWS_DASHBOARDS);
    let dashboards;
    if (!dashboardDef) {
      throw new Error('Environment variable AWS_DASHBOARDS is not set. It should be set with JSON array, e.g [{"dashboardName": "myDashboard"}]');
    }
    try {
      dashboards = JSON.parse(dashboardDef);
    } catch (err) {
      throw new Error('Error, AWS_DASHBOARDS is not valid JSON');
    }
    if (!Array.isArray(dashboards)) {
      throw new Error('Expecting AWS_DASHBOARDS to be an array');
    }
    return dashboards;
  }

  ec2MetricsFromDescribeInstances(ec2DescribeInstances, metricName) {
    return _.chain(ec2DescribeInstances.Reservations)
    .map('Instances')
    .flatten()
    .map((instance) => {
      const idAndLabel = {
        id: instance.InstanceId,
        label: instance.InstanceId,
      };
      _.each(instance.Tags, tag => {
        if (tag.Key === NAME_TAG) {
          idAndLabel.label = tag.Value;
          return false;
        }
        return undefined;
      });
      return idAndLabel;
    })
    .sortBy(['label'])
    .map((idAndLabel, i) => {
      const metric = i === 0
        ? [EC2_NAMESPACE, metricName, INSTANCE_ID_DIM, idAndLabel.id]
        : [REPEAT_PREVIOUS, idAndLabel.id];
      if (idAndLabel.id !== idAndLabel.label) {
        metric.push({ label: idAndLabel.label });
      }
      return metric;
    })
    .value();
  }

  async getEC2Metrics(dashboardContext, region, metricName) {
    const params = dashboardContext.dashboard.ec2DescribeInstanceParams || {};
    const context = dashboardContext;
    const { ec2Cache } = context;
    let ec2DescribeInstances;
    // ec2Cache is a cache of instance responses per region for
    // the current dashboard, to limit calls to EC2
    if (!ec2Cache) {
      context.ec2Cache = {};
    } else if (ec2Cache[region]) {
      ec2DescribeInstances = ec2Cache[region];
    }
    if (!ec2DescribeInstances) {
      // Not in cache, call EC2 to get list of regions
      const ec2Client = new AWS.EC2({ region });
      ec2DescribeInstances = await ec2Client.describeInstances(params).promise();
      context.ec2Cache[region] = ec2DescribeInstances;
    }
    return this.ec2MetricsFromDescribeInstances(ec2DescribeInstances, metricName);
  }

  async updateDashboard(cloudwatchClient, dashboardContext, dashboardBody) {
    const newDashboard = _.cloneDeep(dashboardBody);
    const { widgets } = newDashboard;
    const { dashboardName } = dashboardContext.dashboard;
    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      const { metrics } = widget.properties;
      const { region } = widget;
      // Check to see if it's a metric widget and first metric is an EC2 Instance metric
      if (widget.type === METRIC_WIDGET_TYPE && metrics
      && (metrics[0].length === 4 || metrics[0].length === 5)
      && metrics[0][0] === EC2_NAMESPACE && metrics[0][2] === INSTANCE_ID_DIM) {
        widget.properties.metrics = await this
        .getEC2Metrics(dashboardContext, region, metrics[0][1]);
      }
    }
    if (JSON.stringify(dashboardBody) !== JSON.stringify(newDashboard)) {
      // Save updated dashboard
      await cloudwatchClient.putDashboard({
        DashboardName: dashboardName,
        DashboardBody: JSON.stringify(newDashboard),
      }).promise();
    }
  }
}
module.exports = {
  Dashboard,
};
