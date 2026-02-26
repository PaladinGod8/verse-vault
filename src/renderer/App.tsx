import { Routes, Route } from 'react-router-dom';
import './index.css';

function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">💖 Hello World!</h1>
      <p>Welcome to your Electron application.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
