import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Client
import { ClientHome, ClientTicket, ClientWaiting, ClientMap, ClientArrival, ClientDone } from './screens/client/ClientScreens.jsx';

// Valet
import { UserLogin }         from './screens/user/UserLogin.jsx';
import { UserScan }          from './screens/user/UserScan.jsx';
import { UserMissionNew }    from './screens/user/UserMissionNew.jsx';
import { UserMission }       from './screens/user/UserMission.jsx';
import { UserNotifications } from './screens/user/UserNotifications.jsx';
import { UserReturn }        from './screens/user/UserReturn.jsx';
import { UserClose }         from './screens/user/UserClose.jsx';

// Manager
import { ManagerDashboard }  from './screens/manager/ManagerDashboard.jsx';
import { ManagerMap }        from './screens/manager/ManagerMap.jsx';
import { ManagerValets, ManagerAjoutVoiturier, ManagerValetDetail } from './screens/manager/ManagerValets.jsx';
import { ManagerProfil }     from './screens/manager/ManagerProfil.jsx';

// Admin
import { AdminLogin, AdminParametres, AdminProfil } from './screens/admin/AdminAuth.jsx';
import { AdminDashboard }    from './screens/admin/AdminDashboard.jsx';
import { AdminManagers, AdminManagerDetail } from './screens/admin/AdminManagers.jsx';
import { AdminVoituriers, AdminValetDetail } from './screens/admin/AdminVoituriers.jsx';
import { AdminQRCodes }      from './screens/admin/AdminQRCodes.jsx';

function Loader() {
  return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
}

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/client/accueil" replace />} />

      {/* Client — public */}
      <Route path="/client/accueil"       element={<ClientHome />} />
      <Route path="/client/ticket/:qrId"  element={<ClientTicket />} />
      <Route path="/client/waiting/:qrId" element={<ClientWaiting />} />
      <Route path="/client/map/:qrId"     element={<ClientMap />} />
      <Route path="/client/arrival/:qrId" element={<ClientArrival />} />
      <Route path="/client/done/:qrId"    element={<ClientDone />} />

      {/* Valet */}
      <Route path="/user/login"          element={<UserLogin />} />
      <Route path="/user/scan"           element={<Guard roles={['valet']}><UserScan /></Guard>} />
      <Route path="/user/mission/new"    element={<Guard roles={['valet']}><UserMissionNew /></Guard>} />
      <Route path="/user/mission/:id"    element={<Guard roles={['valet']}><UserMission /></Guard>} />
      <Route path="/user/notifications"  element={<Guard roles={['valet']}><UserNotifications /></Guard>} />
      <Route path="/user/return/:id"     element={<Guard roles={['valet']}><UserReturn /></Guard>} />
      <Route path="/user/close/:id"      element={<Guard roles={['valet']}><UserClose /></Guard>} />

      {/* Manager */}
      <Route path="/manager/dashboard"              element={<Guard roles={['manager','admin']}><ManagerDashboard /></Guard>} />
      <Route path="/manager/map"                    element={<Guard roles={['manager','admin']}><ManagerMap /></Guard>} />
      <Route path="/manager/voituriers"             element={<Guard roles={['manager','admin']}><ManagerValets /></Guard>} />
      <Route path="/manager/ajout-voiturier"        element={<Guard roles={['manager','admin']}><ManagerAjoutVoiturier /></Guard>} />
      <Route path="/manager/voituriers/:id"         element={<Guard roles={['manager','admin']}><ManagerValetDetail /></Guard>} />
      <Route path="/manager/profil"                 element={<Guard roles={['manager','admin']}><ManagerProfil /></Guard>} />

      {/* Admin */}
      <Route path="/admin/login"                    element={<AdminLogin />} />
      <Route path="/admin/dashboard"                element={<Guard roles={['admin']}><AdminDashboard /></Guard>} />
      <Route path="/admin/managers"                 element={<Guard roles={['admin']}><AdminManagers /></Guard>} />
      <Route path="/admin/managers/:id"             element={<Guard roles={['admin']}><AdminManagerDetail /></Guard>} />
      <Route path="/admin/voituriers"               element={<Guard roles={['admin']}><AdminVoituriers /></Guard>} />
      <Route path="/admin/voituriers/:id"           element={<Guard roles={['admin']}><AdminValetDetail /></Guard>} />
      <Route path="/admin/qrcodes"                  element={<Guard roles={['admin']}><AdminQRCodes /></Guard>} />
      <Route path="/admin/parametres"               element={<Guard roles={['admin']}><AdminParametres /></Guard>} />
      <Route path="/admin/profil"                   element={<Guard roles={['admin']}><AdminProfil /></Guard>} />

      <Route path="*" element={<Navigate to="/client/accueil" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
