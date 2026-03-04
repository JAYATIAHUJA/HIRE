import { motion, type Easing } from 'framer-motion';
import { Link } from 'react-router-dom';
import Reveal from './Reveal';

const ease: Easing = [0.77, 0, 0.175, 1];

export default function FinalCTA() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Grain reinforcement */}
      <div className="hire-grain" style={{ opacity: 0.05 }} />

      <div className="text-center hire-container relative z-10">
        <Reveal>
          <h2 className="text-[clamp(2.8rem,7vw,6rem)] font-semibold tracking-[-0.035em] leading-[1.05] text-white">
            Stop Applying.
            <br />
            Start Automating.
          </h2>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-12">
            <motion.div
              className="inline-block"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.3, ease }}
            >
              <Link
                to="/onboarding"
                className="group relative inline-flex items-center justify-center px-10 py-4 text-sm font-medium rounded-xl bg-white text-[#0B0B0F] transition-colors duration-300 hover:bg-[#00FF94]"
              >
                {/* Hover glow */}
                <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-[#00FF94]/20 blur-xl transition-all duration-500 pointer-events-none" />
                <span className="relative">Get Started</span>
              </Link>
            </motion.div>
          </div>
        </Reveal>

        <Reveal delay={0.5}>
          <p className="mt-10 text-[0.7rem] text-white/20 tracking-widest">
            Your AI job-hunting assistant.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
