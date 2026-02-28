import { Route, Routes } from 'react-router-dom';
import WorldsHomePage from './pages/WorldsHomePage';
import WorldPage from './pages/WorldPage';
import LevelsPage from './pages/LevelsPage';
import AbilitiesPage from './pages/AbilitiesPage';
import CampaignsPage from './pages/CampaignsPage';
import ArcsPage from './pages/ArcsPage';
import ActsPage from './pages/ActsPage';
import SessionsPage from './pages/SessionsPage';
import ScenesPage from './pages/ScenesPage';
import './index.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WorldsHomePage />} />
      <Route path="/world/:id" element={<WorldPage />} />
      <Route path="/world/:id/levels" element={<LevelsPage />} />
      <Route path="/world/:id/abilities" element={<AbilitiesPage />} />
      <Route path="/world/:id/campaigns" element={<CampaignsPage />} />
      <Route
        path="/world/:id/campaign/:campaignId/arcs"
        element={<ArcsPage />}
      />
      <Route
        path="/world/:id/campaign/:campaignId/arc/:arcId/acts"
        element={<ActsPage />}
      />
      <Route
        path="/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions"
        element={<SessionsPage />}
      />
      <Route
        path="/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes"
        element={<ScenesPage />}
      />
    </Routes>
  );
}
