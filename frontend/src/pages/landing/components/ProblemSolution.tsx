import { motion, type Easing } from 'framer-motion';
import Reveal from './Reveal';

const ease: Easing = [0.77, 0, 0.175, 1];

export default function ProblemSolution() {
  return (
    <section className="relative py-32 overflow-hidden border-t border-white/[0.04]">
      <div className="hire-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">
          {/* Left: Problem Text */}
          <div className="lg:col-span-5">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-6">
                Applying shouldn't be<br />a full-time job.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-lg text-white/50 leading-relaxed mb-8">
                The current process is broken. You spend hours adjusting formats, writing cover letters, and filling repetitive workday forms for each opening instead of preparing for interviews.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="inline-flex items-center gap-3 text-[#00FF94] font-medium text-sm tracking-wider uppercase border border-[#00FF94]/20 bg-[#00FF94]/5 px-4 py-2 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF94] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF94]"></span>
                </span>
                With HIRE, it's automated.
              </div>
            </Reveal>
          </div>

          {/* Right: Mock UI Transition (Problem -> Solution) */}
          <div className="lg:col-span-7 relative">
            <Reveal delay={0.3} className="relative h-[360px] sm:h-[420px] rounded-2xl border border-white/10 bg-[#111116] overflow-hidden flex flex-col">
              {/* Fake Browser Header */}
              <div className="h-10 border-b border-white/5 bg-[#16161C] flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="mx-auto w-1/3 h-4 bg-white/5 rounded-full" />
              </div>
              
              {/* Form Content */}
              <div className="flex-1 p-8 relative overflow-hidden flex flex-col gap-6">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-white/10 rounded-md" />
                  <div className="h-10 w-full bg-[#0B0B0F] border border-white/5 rounded-md" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-white/10 rounded-md" />
                  <div className="h-10 w-full bg-[#0B0B0F] border border-white/5 rounded-md" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-white/10 rounded-md" />
                  <div className="h-32 w-full bg-[#0B0B0F] border border-white/5 rounded-md" />
                </div>

                {/* Animated Solver Layer */}
                <motion.div 
                  className="absolute inset-0 bg-[#0B0B0F]/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 text-center"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ margin: '-100px' }}
                  transition={{ duration: 1.5, delay: 0.8, ease }}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.2, ease }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-[#00FF94]/10 flex items-center justify-center mb-6 mx-auto border border-[#00FF94]/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">Automated by Core Engine</h3>
                    <p className="text-sm text-white/50">Details mapped and submitted via Playwright.</p>
                  </motion.div>
                </motion.div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
