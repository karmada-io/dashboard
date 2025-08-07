import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import PersistentVolumesPage from './pages/storage/PersistentVolumesPage';
import PersistentVolumeClaimsPage from './pages/storage/PersistentVolumeClaimsPage';
import StorageClassesPage from './pages/storage/StorageClassesPage';
import RolesPage from './pages/access-control/RolesPage';
import ClusterRolesPage from './pages/access-control/ClusterRolesPage';
import RoleBindingsPage from './pages/access-control/RoleBindingsPage';
import ClusterRoleBindingsPage from './pages/access-control/ClusterRoleBindingsPage';
import ServiceAccountsPage from './pages/access-control/ServiceAccountsPage';
import ServicesPage from './pages/networking/ServicesPage';
import IngressesPage from './pages/networking/IngressesPage';
import NetworkPoliciesPage from './pages/networking/NetworkPoliciesPage';
import DeploymentsPage from './pages/workloads/DeploymentsPage';
import StatefulSetsPage from './pages/workloads/StatefulSetsPage';
import DaemonSetsPage from './pages/workloads/DaemonSetsPage';
import JobsPage from './pages/workloads/JobsPage';
import CronJobsPage from './pages/workloads/CronJobsPage';
import PodsPage from './pages/workloads/PodsPage';
import CrdListPage from './pages/custom-resources/CrdListPage';
import CrdObjectsPage from './pages/custom-resources/CrdObjectsPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/storage/persistentvolumes" />} />
          <Route
            path="storage/persistentvolumes"
            element={<PersistentVolumesPage />}
          />
          <Route
            path="storage/persistentvolumeclaims"
            element={<PersistentVolumeClaimsPage />}
          />
          <Route
            path="storage/storageclasses"
            element={<StorageClassesPage />}
          />
          <Route path="access-control/roles" element={<RolesPage />} />
          <Route
            path="access-control/clusterroles"
            element={<ClusterRolesPage />}
          />
          <Route
            path="access-control/rolebindings"
            element={<RoleBindingsPage />}
          />
          <Route
            path="access-control/clusterrolebindings"
            element={<ClusterRoleBindingsPage />}
          />
          <Route
            path="access-control/serviceaccounts"
            element={<ServiceAccountsPage />}
          />
          <Route path="networking/services" element={<ServicesPage />} />
          <Route path="networking/ingresses" element={<IngressesPage />} />
          <Route
            path="networking/networkpolicies"
            element={<NetworkPoliciesPage />}
          />
          <Route path="workloads/deployments" element={<DeploymentsPage />} />
          <Route path="workloads/statefulsets" element={<StatefulSetsPage />} />
          <Route path="workloads/daemonsets" element={<DaemonSetsPage />} />
          <Route path="workloads/jobs" element={<JobsPage />} />
          <Route path="workloads/cronjobs" element={<CronJobsPage />} />
          <Route path="workloads/pods" element={<PodsPage />} />
          <Route path="custom-resources/crds" element={<CrdListPage />} />
          <Route
            path="custom-resources/crds/:crdName"
            element={<CrdObjectsPage />}
          />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
