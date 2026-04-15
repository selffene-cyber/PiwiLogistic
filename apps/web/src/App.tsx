import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RoutesListPage from './pages/routes/RoutesListPage';
import NewRoutePage from './pages/routes/NewRoutePage';
import RouteDetailPage from './pages/routes/RouteDetailPage';
import ClientsListPage from './pages/clients/ClientsListPage';
import TrucksListPage from './pages/trucks/TrucksListPage';
import TruckDetailPage from './pages/trucks/TruckDetailPage';
import WorkersListPage from './pages/workers/WorkersListPage';
import BoxTypesListPage from './pages/box-types/BoxTypesListPage';
import DispatchGuidesPage from './pages/dispatch-guides/DispatchGuidesPage';
import DispatchGuideDetailPage from './pages/dispatch-guides/DispatchGuideDetailPage';
import DeliveriesPage from './pages/deliveries/DeliveriesPage';
import BonusesPage from './pages/bonuses/BonusesPage';
import SettingsPage from './pages/settings/SettingsPage';
import OperationsDashboardPage from './pages/operations/OperationsDashboardPage';

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/operations" element={<OperationsDashboardPage />} />
        <Route path="/routes" element={<RoutesListPage />} />
        <Route path="/routes/new" element={<NewRoutePage />} />
        <Route path="/routes/:id" element={<RouteDetailPage />} />
        <Route path="/clients" element={<ClientsListPage />} />
        <Route path="/trucks" element={<TrucksListPage />} />
        <Route path="/trucks/:id" element={<TruckDetailPage />} />
        <Route path="/workers" element={<WorkersListPage />} />
        <Route path="/box-types" element={<BoxTypesListPage />} />
        <Route path="/dispatch-guides" element={<DispatchGuidesPage />} />
        <Route path="/dispatch-guides/:id" element={<DispatchGuideDetailPage />} />
        <Route path="/deliveries" element={<DeliveriesPage />} />
        <Route path="/bonuses" element={<ProtectedRoute requireRole="ADMIN"><BonusesPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute requireRole="ADMIN"><SettingsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}