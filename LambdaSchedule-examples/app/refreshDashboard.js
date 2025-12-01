import AWS from 'aws-sdk';
import { Dashboard } from './services/dashboard.js';

const refreshDashboard = async () => {
  const dashboards = new Dashboard().getDashboards();
  const cloudwatch = new AWS.CloudWatch();
  for (let i = 0; i < dashboards.length; i++) {
    const dashboard = dashboards[i];
    const dashboardContext = { dashboard };
    if (dashboard.dashboardName) {
      await cloudwatch.getDashboard({ DashboardName: dashboard.dashboardName }).promise()
      .then(response => new Dashboard()
      .updateDashboard(cloudwatch, dashboardContext, JSON.parse(response.DashboardBody)));
    }
  }
};

export { refreshDashboard };
