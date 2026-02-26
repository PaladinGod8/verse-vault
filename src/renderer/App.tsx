import { Route, Routes } from 'react-router-dom';
import WorldsHomePage from './pages/WorldsHomePage';
import './index.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WorldsHomePage />} />
    </Routes>
  );
}
