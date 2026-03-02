import { motion, useScroll, useTransform, type Easing } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Reveal from './Reveal';

const ease: Easing = [0.77, 0, 0.175, 1];

const pipeline = ['SCRAPE', 'MATCH', 'TAILOR', 'APPLY', 'TRACK'];

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  return (
    <section ref={sectionRef} className="relative min-h-screen pt-32 pb-16 flex items-center overflow-hidden">
      {/* Very Subtle gradient background mesh */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#00FF94]/[0.02] via-[#0B0B0F] to-transparent pointer-events-none" />

      <motion.div
        className="relative z-10 w-full hire-container"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left content */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            <Reveal duration={1.2} y={30}>
              <h1 className="text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white">
                Automate Your Entire Job Application Workflow.
              </h1>
            </Reveal>

            <Reveal delay={0.2} duration={1.2} y={20}>
              <p className="mt-8 text-[clamp(1rem,1.5vw,1.25rem)] font-normal text-white/60 max-w-xl leading-relaxed">
                HIRE discovers relevant jobs, ranks them using vector similarity,
                customizes your resume with AI, and submits applications automatically.
              </p>
            </Reveal>

            <Reveal delay={0.4} duration={1.2} y={20}>
              <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  to="/onboarding"
                  className="group relative inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg bg-white text-[#0B0B0F] transition-all duration-300 hover:bg-[#00FF94] hover:scale-105 active:scale-95"
                >
                  <span className="absolute inset-0 rounded-lg bg-[#00FF94]/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative">Get Started</span>
                </Link>
                <a
                  href="https://github.com/JAYATIAHUJA/HIRE"
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg border border-white/10 text-white transition-all duration-300 hover:bg-white/5 hover:border-white/20 active:scale-95"
                >
                  View GitHub
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right side - Pipeline Visualization */}
          <div className="lg:col-span-5 h-[400px] sm:h-[500px] flex items-center justify-center lg:justify-end relative">
            <Reveal delay={0.6} duration={1.5} className="w-full max-w-md h-full relative pl-8">
              <div className="absolute left-[55px] top-[24px] bottom-[24px] w-px bg-white/10" />
              
              {/* Animated Progress Line */}
              <motion.div 
                className="absolute left-[55px] top-[24px] bottom-[24px] w-px bg-gradient-to-b from-[#00FF94] to-[#00FF94]/0 origin-top"
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 2.5, ease, delay: 1 }}
              />

              <div className="h-full flex flex-col justify-between py-4 relative z-10">
                {pipeline.map((step, i) => (
                  <motion.div 
                    key={step} 
                    className="flex items-center gap-6"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 1 + i * 0.15, ease }}
                  >
                    <div className="w-12 h-12 rounded-full border border-white/10 bg-[#0B0B0F] shadow-2xl flex items-center justify-center relative shrink-0">
                      {/* Inner dot */}
                      <motion.div 
                        className="w-2 h-2 rounded-full bg-white/20"
                        animate={{ backgroundColor: ['rgba(255,255,255,0.2)', '#00FF94', 'rgba(255,255,255,0.2)'] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                      />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold tracking-wider text-white/40 mb-1">STEP 0{i + 1}</h3>
                      <p className="text-sm sm:text-base font-medium text-white tracking-[0.15em] uppercase">{step}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
