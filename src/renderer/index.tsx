import App from './App';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

const container = document.getElementById('root') as HTMLDivElement;
const root = createRoot(container);

root.render(
  <HashRouter>
    <App />
  </HashRouter>,
);
