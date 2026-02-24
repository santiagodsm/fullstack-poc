import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MasterDataPage from './pages/MasterDataPage';
import AgricultoresPage from './pages/masterdata/AgricultoresPage';
import ClientesPage from './pages/masterdata/ClientesPage';
import ProductosEsparragoPage from './pages/masterdata/ProductosEsparragoPage';
import ComisionesPage from './pages/masterdata/ComisionesPage';
import CajasPage from './pages/masterdata/CajasPage';
import IngresoDataPage from './pages/IngresoDataPage';
import InventarioPage from './pages/ingresodata/InventarioPage';
import FacturaInicialPage from './pages/ingresodata/FacturaInicialPage';
import FacturaFinalPage from './pages/ingresodata/FacturaFinalPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/master-data" element={<MasterDataPage />} />
        <Route path="/master-data/agricultores" element={<AgricultoresPage />} />
        <Route path="/master-data/clientes" element={<ClientesPage />} />
        <Route path="/master-data/producto-esparrago" element={<ProductosEsparragoPage />} />
        <Route path="/master-data/comisiones" element={<ComisionesPage />} />
        <Route path="/master-data/cajas" element={<CajasPage />} />
        <Route path="/ingreso-data" element={<IngresoDataPage />} />
        <Route path="/ingreso-data/inventario" element={<InventarioPage />} />
        <Route path="/ingreso-data/factura-inicial" element={<FacturaInicialPage />} />
        <Route path="/ingreso-data/factura-final" element={<FacturaFinalPage />} />
      </Routes>
    </Router>
  );
}

export default App;
