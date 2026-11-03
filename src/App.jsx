import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import './App.css';

// Mocks provisórios para as páginas
const Descobrir = () => <h1> O que você quer descobrir na cidade hoje? :) </h1>;
const Explorar = () => <h1>Mapa Interativo :P</h1>;
const Rotas = () => <h1>Planejamento de Rotas :o</h1>;
const Salvos = () => <h1> Meus Lugares Salvos S2 </h1>;
const Login = () => <h1>Login / Criar Conta </h1>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Descobrir />} />
          <Route path="explorar" element={<Explorar />} />
          <Route path="rotas" element={<Rotas />} />
          <Route path="salvos" element={<Salvos />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;