import React from 'react';
import { Layout, Menu } from 'antd';
import { Link, Outlet } from 'react-router-dom';
import { Hdd, Database, Library, Users, UserCheck, UserCog, User, UserSquare, Network, Server, Globe, Shield, Cpu, Briefcase, Timer, Box, Truck, Puzzle } from 'lucide-react';

const { Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <div className="demo-logo-vertical" />
        <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']}>
          <Menu.SubMenu key="storage" icon={<Hdd />} title="Storage">
            <Menu.Item key="pvs" icon={<Database />}>
              <Link to="/storage/persistentvolumes">Persistent Volumes</Link>
            </Menu.Item>
            <Menu.Item key="pvcs" icon={<Database />}>
              <Link to="/storage/persistentvolumeclaims">
                Persistent Volume Claims
              </Link>
            </Menu.Item>
            <Menu.Item key="scs" icon={<Library />}>
              <Link to="/storage/storageclasses">Storage Classes</Link>
            </Menu.Item>
          </Menu.SubMenu>
          <Menu.SubMenu key="rbac" icon={<Users />} title="Access Control">
            <Menu.Item key="roles" icon={<UserCheck />}>
              <Link to="/access-control/roles">Roles</Link>
            </Menu.Item>
            <Menu.Item key="clusterroles" icon={<UserCog />}>
              <Link to="/access-control/clusterroles">Cluster Roles</Link>
            </Menu.Item>
            <Menu.Item key="rolebindings" icon={<User />}>
              <Link to="/access-control/rolebindings">Role Bindings</Link>
            </Menu.Item>
            <Menu.Item key="clusterrolebindings" icon={<UserSquare />}>
              <Link to="/access-control/clusterrolebindings">
                Cluster Role Bindings
              </Link>
            </Menu.Item>
            <Menu.Item key="serviceaccounts" icon={<User />}>
              <Link to="/access-control/serviceaccounts">
                Service Accounts
              </Link>
            </Menu.Item>
          </Menu.SubMenu>
          <Menu.SubMenu key="networking" icon={<Network />} title="Networking">
            <Menu.Item key="services" icon={<Server />}>
              <Link to="/networking/services">Services</Link>
            </Menu.Item>
            <Menu.Item key="ingresses" icon={<Globe />}>
              <Link to="/networking/ingresses">Ingresses</Link>
            </Menu.Item>
            <Menu.Item key="networkpolicies" icon={<Shield />}>
              <Link to="/networking/networkpolicies">Network Policies</Link>
            </Menu.Item>
          </Menu.SubMenu>
          <Menu.SubMenu key="workloads" icon={<Cpu />} title="Workloads">
            <Menu.Item key="deployments" icon={<Server />}>
              <Link to="/workloads/deployments">Deployments</Link>
            </Menu.Item>
            <Menu.Item key="statefulsets" icon={<Database />}>
              <Link to="/workloads/statefulsets">StatefulSets</Link>
            </Menu.Item>
            <Menu.Item key="daemonsets" icon={<Truck />}>
              <Link to="/workloads/daemonsets">DaemonSets</Link>
            </Menu.Item>
            <Menu.Item key="jobs" icon={<Briefcase />}>
              <Link to="/workloads/jobs">Jobs</Link>
            </Menu.Item>
            <Menu.Item key="cronjobs" icon={<Timer />}>
              <Link to="/workloads/cronjobs">CronJobs</Link>
            </Menu.Item>
            <Menu.Item key="pods" icon={<Box />}>
              <Link to="/workloads/pods">Pods</Link>
            </Menu.Item>
          </Menu.SubMenu>
          <Menu.Item key="crds" icon={<Puzzle />}>
            <Link to="/custom-resources/crds">Custom Resources</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Content style={{ margin: '16px' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
