import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landing/LandingPage';
import FeedPage from './pages/FeedPage';
import ApplicationPreviewPage from './pages/ApplicationPreviewPage';
import ApplicationHistoryPage from './pages/ApplicationHistoryPage';
import OnboardingPage from './pages/OnboardingPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/applications" element={<ApplicationHistoryPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/applications/:id" element={<ApplicationPreviewPage />} />
    </Routes>
  );
}   

export default App;