import { motion, type Easing } from 'framer-motion';
import Reveal from './Reveal';

const ease: Easing = [0.77, 0, 0.175, 1];

const features = [
  'Application status tracking',
  'Failure logs & real-time alerts',
  'Screenshot previews of automation',
  'One-click retry controls',
];

export default function DashboardPreview() {
  return (
    <section id="dashboard" className="relative py-32 overflow-hidden border-t border-white/[0.04]">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00FF94]/[0.015] rounded-full blur-[100px] pointer-events-none" />

      <div className="hire-container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-center">
          
          <div className="lg:col-span-4">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-6">
                Complete<br />Application<br />Visibility.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <ul className="space-y-4 mt-8">
                {features.map((feature, i) => (
                  <motion.li 
                    key={i}
                    className="flex items-center gap-3 text-white/60"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {feature}
                  </motion.li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <Reveal delay={0.3} className="relative rounded-2xl border border-white/10 bg-[#0B0B0F] overflow-hidden shadow-2xl overflow-x-hidden">
              <div className="h-10 border-b border-white/5 bg-[#111116] flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <div className="p-6 sm:p-8 bg-[#0B0B0F]">
                {/* Mock Dashboard UI */}
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <div className="h-5 w-32 bg-white/10 rounded mb-2" />
                    <div className="h-4 w-48 bg-white/5 rounded" />
                  </div>
                  <div className="h-8 w-24 bg-[#00FF94]/10 border border-[#00FF94]/20 rounded-lg" />
                </div>
                
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <motion.div 
                      key={item}
                      className="p-4 rounded-xl border border-white/5 bg-[#111116] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      whileHover={{ backgroundColor: 'rgba(22, 22, 28, 1)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5" />
                        <div>
                          <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                          <div className="h-3 w-20 bg-white/5 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="h-6 w-20 bg-[#00FF94]/10 rounded-full" />
                        <div className="h-4 w-16 bg-white/5 rounded" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
