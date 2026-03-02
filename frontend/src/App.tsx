import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import LandingPage from './pages/LandingPage';
import FeedPage from './pages/FeedPage';
import ApplicationPreviewPage from './pages/ApplicationPreviewPage';
import ApplicationHistoryPage from './pages/ApplicationHistoryPage';
import OnboardingPage from './pages/OnboardingPage';

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/applications" element={<ApplicationHistoryPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/applications/:id" element={<ApplicationPreviewPage />} />
      </Routes>
    </>
  );
}   

export default App;