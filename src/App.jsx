import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './components/AuthProvider';
import Layout from './components/Layout';
import Login from './pages/Login';
import './App.css';

// Mocks provisórios para as páginas
const Descobrir = () => <h1> O que você quer descobrir na cidade hoje? :) </h1>;
const Explorar = () => <h1>Mapa Interativo :P</h1>;
const Rotas = () => <h1>Planejamento de Rotas :o</h1>;
const Salvos = () => <h1> Meus Lugares Salvos S2 </h1>;
const Lugar = () => <h1>Detalhes do lugar :)</h1>; // substituída pela página da issue #2

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Descobrir />} />
            <Route path="explorar" element={<Explorar />} />
            <Route path="rotas" element={<Rotas />} />
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