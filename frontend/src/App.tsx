import { Routes, Route } from 'react-router-dom';
import FeedPage from './pages/FeedPage';
import ApplicationPreviewPage from './pages/ApplicationPreviewPage';
import ApplicationHistoryPage from './pages/ApplicationHistoryPage';
import OnboardingPage from './pages/OnboardingPage';
import AnimatedBackground from './components/AnimatedBackground';

function App() {
  return (
    <>
      <AnimatedBackground />
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/applications" element={<ApplicationHistoryPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/applications/:id" element={<ApplicationPreviewPage />} />
      </Routes>
    </>
  );
}

export default App;



