import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import BottomNav from './components/layout/BottomNav';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Shipping from './pages/Shipping';
import Finance from './pages/Finance';
import Login from './pages/Login';

function PrivateApp() {
  const { profile } = useAuth();

  if (!profile) return <Navigate to="/login" replace />;

  return (
    <AppProvider>
      <div className="relative max-w-lg mx-auto min-h-screen">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/pedidos"   element={<Orders />} />
          <Route path="/clientes"  element={<Clients />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/envios"    element={<Shipping />} />
          <Route path="/finanzas"  element={<Finance />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/*"     element={<PrivateApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoginRoute() {
  const { profile } = useAuth();
  if (profile) return <Navigate to="/" replace />;
  return <Login />;
}

export default App;
