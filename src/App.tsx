import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import BottomNav from './components/layout/BottomNav';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Shipping from './pages/Shipping';
import Finance from './pages/Finance';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="relative max-w-lg mx-auto min-h-screen">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/pedidos"   element={<Orders />} />
            <Route path="/clientes"  element={<Clients />} />
            <Route path="/productos" element={<Products />} />
            <Route path="/envios"    element={<Shipping />} />
            <Route path="/finanzas"  element={<Finance />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
