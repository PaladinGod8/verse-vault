import { Route, Routes } from 'react-router-dom';
import WorldsHomePage from './pages/WorldsHomePage';
import WorldPagePlaceholder from './pages/WorldPagePlaceholder';
import './index.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WorldsHomePage />} />
      <Route path="/world/:id" element={<WorldPagePlaceholder />} />
    </Routes>
  );
}
