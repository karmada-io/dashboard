import React from 'react';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import { Server, Package, Shield, Activity, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const DashboardPage: React.FC = () => {
  // Mock data - in real app this would come from API
  const stats = {
    clusters: { total: 12, healthy: 11, warning: 1, error: 0 },
    workloads: { total: 847, running: 820, pending: 15, failed: 12 },
    policies: { total: 45, active: 42, inactive: 3 },
    nodes: { total: 156, ready: 152, notReady: 4 },
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    change: string;
    trend: 'up' | 'down' | 'stable';
    icon: React.ElementType;
    color: string;
  }> = ({ title, value, change, trend, icon: Icon, color }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardBody className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
              {title}
            </p>
            <p className="text-3xl font-bold text-secondary-900 dark:text-white">
              {value.toLocaleString()}
            </p>
            <div className="flex items-center mt-2">
              <TrendingUp className={`h-4 w-4 mr-1 ${
                trend === 'up' ? 'text-success-500' : 
                trend === 'down' ? 'text-danger-500' : 'text-secondary-500'
              }`} />
              <span className={`text-sm ${
                trend === 'up' ? 'text-success-600' : 
                trend === 'down' ? 'text-danger-600' : 'text-secondary-600'
              }`}>
                {change}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardBody>
    </Card>
  );

  const StatusCard: React.FC<{
    title: string;
    stats: { total: number; healthy?: number; running?: number; active?: number; ready?: number; warning?: number; pending?: number; inactive?: number; notReady?: number; error?: number; failed?: number };
  }> = ({ title, stats }) => (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
          {title}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">Total</span>
            <span className="font-semibold text-secondary-900 dark:text-white">{stats.total}</span>
          </div>
          
          {(stats.healthy || stats.running || stats.active || stats.ready) && (
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  {stats.healthy ? 'Healthy' : stats.running ? 'Running' : stats.active ? 'Active' : 'Ready'}
                </span>
              </div>
              <span className="font-semibold text-success-600">
                {stats.healthy || stats.running || stats.active || stats.ready}
              </span>
            </div>
          )}
          
          {(stats.warning || stats.pending || stats.inactive || stats.notReady) && (
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {stats.warning || stats.notReady ? (
                  <AlertTriangle className="h-4 w-4 text-warning-500 mr-2" />
                ) : (
                  <Clock className="h-4 w-4 text-warning-500 mr-2" />
                )}
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  {stats.warning ? 'Warning' : stats.pending ? 'Pending' : stats.inactive ? 'Inactive' : 'Not Ready'}
                </span>
              </div>
              <span className="font-semibold text-warning-600">
                {stats.warning || stats.pending || stats.inactive || stats.notReady}
              </span>
            </div>
          )}
          
          {(stats.error || stats.failed) && (
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-danger-500 mr-2" />
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  {stats.error ? 'Error' : 'Failed'}
                </span>
              </div>
              <span className="font-semibold text-danger-600">
                {stats.error || stats.failed}
              </span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
          Dashboard Overview
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400 mt-2">
          Monitor your multi-cloud Kubernetes infrastructure at a glance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Clusters"
          value={stats.clusters.total}
          change="+2 this week"
          trend="up"
          icon={Server}
          color="bg-primary-500"
        />
        <StatCard
          title="Total Workloads"
          value={stats.workloads.total}
          change="+15% this month"
          trend="up"
          icon={Package}
          color="bg-success-500"
        />
        <StatCard
          title="Active Policies"
          value={stats.policies.total}
          change="No change"
          trend="stable"
          icon={Shield}
          color="bg-warning-500"
        />
        <StatCard
          title="Total Nodes"
          value={stats.nodes.total}
          change="+8 this week"
          trend="up"
          icon={Activity}
          color="bg-purple-500"
        />
      </div>

      {/* Status Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatusCard title="Cluster Status" stats={stats.clusters} />
        <StatusCard title="Workload Status" stats={stats.workloads} />
        <StatusCard title="Policy Status" stats={stats.policies} />
        <StatusCard title="Node Status" stats={stats.nodes} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Recent Activity
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {[
                { action: 'Cluster us-west-2 joined', time: '2 minutes ago', type: 'success' },
                { action: 'Deployment nginx-app scaled to 5 replicas', time: '5 minutes ago', type: 'info' },
                { action: 'Policy web-policy updated', time: '10 minutes ago', type: 'warning' },
                { action: 'Node node-3 became ready', time: '15 minutes ago', type: 'success' },
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'success' ? 'bg-success-500' :
                    activity.type === 'warning' ? 'bg-warning-500' : 'bg-primary-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-secondary-900 dark:text-white">
                      {activity.action}
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              System Health
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {[
                { component: 'Karmada API Server', status: 'Healthy', uptime: '99.9%' },
                { component: 'Controller Manager', status: 'Healthy', uptime: '99.8%' },
                { component: 'Scheduler', status: 'Healthy', uptime: '99.9%' },
                { component: 'ETCD Cluster', status: 'Healthy', uptime: '100%' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success-500" />
                    <span className="text-sm text-secondary-900 dark:text-white">
                      {item.component}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-success-600">
                      {item.status}
                    </div>
                    <div className="text-xs text-secondary-500 dark:text-secondary-400">
                      {item.uptime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;