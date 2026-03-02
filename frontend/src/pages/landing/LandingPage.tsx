import { lazy, Suspense } from 'react';
import { motion, type Easing } from 'framer-motion';
import {
  GrainOverlay,
  Navbar,
  Hero,
  Workflow,
  ProblemSolution,
  TechnologyStack,
  DashboardPreview,
  FinalCTA,
  Footer,
} from './components';
import { useLenis } from './hooks/useSmoothScroll';
import './styles/global.css';

const BackgroundCanvas = lazy(() => import('./components/BackgroundCanvas'));

const ease: Easing = [0.77, 0, 0.175, 1];

export default function LandingPage() {
  useLenis();

  return (
    <motion.div
      className="min-h-screen bg-[#0B0B0F] text-white overflow-x-hidden font-sans selection:bg-[#00FF94] selection:text-[#0B0B0F]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease }}
    >
      <Suspense fallback={null}>
        <BackgroundCanvas />
      </Suspense>
      <GrainOverlay />
      <Navbar />
      <Hero />
      <ProblemSolution />
      <Workflow />
      <TechnologyStack />
      <DashboardPreview />
      <FinalCTA />
      <Footer />
    </motion.div>
  );
}
