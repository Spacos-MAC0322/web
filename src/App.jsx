import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './components/AuthProvider';
import Layout from './components/Layout';
import Descobrir from './pages/Descobrir';
import Explorar from './pages/Explorar';
import Lugar from './pages/Lugar';
import Login from './pages/Login';
import Roteiro from './pages/Roteiro';
import Rotas from './pages/Rotas';
import Salvos from './pages/Salvos';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Descobrir />} />
            <Route path="explorar" element={<Explorar />} />
            <Route path="rotas" element={<Rotas />} />
            <Route path="rotas/novo" element={<Roteiro />} />
            <Route path="rotas/:id" element={<Roteiro />} />
            <Route path="salvos" element={<Salvos />} />
            <Route path="lugar/:id" element={<Lugar />} />
            <Route path="login" element={<Login />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;