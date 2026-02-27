import { Route, Routes } from 'react-router-dom';
import WorldsHomePage from './pages/WorldsHomePage';
import WorldPage from './pages/WorldPage';
import LevelsPage from './pages/LevelsPage';
import AbilitiesPage from './pages/AbilitiesPage';
import './index.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WorldsHomePage />} />
      <Route path="/world/:id" element={<WorldPage />} />
      <Route path="/world/:id/levels" element={<LevelsPage />} />
      <Route path="/world/:id/abilities" element={<AbilitiesPage />} />
    </Routes>
  );
}
