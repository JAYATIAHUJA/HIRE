import { motion, type Easing } from 'framer-motion';
import Reveal from './Reveal';

const ease: Easing = [0.77, 0, 0.175, 1];

const technologies = [
  { name: 'React 18', category: 'Frontend' },
  { name: 'NestJS', category: 'Backend' },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'pgvector', category: 'Vector Search' },
  { name: 'Playwright', category: 'Automation' },
  { name: 'Google Gemini', category: 'LLM Engine' },
  { name: 'Docker', category: 'Infrastructure' },
];

export default function TechnologyStack() {
  return (
    <section id="technology" className="relative py-32 border-t border-white/[0.04] bg-[#0B0B0F]">
      <div className="hire-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-4">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-6">
                Enterprise-Grade<br />Stack.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-lg text-white/50 leading-relaxed">
                Built for scale, stability, and speed. Utilizing modern infrastructure and deterministic automation patterns.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {technologies.map((tech, i) => (
                <Reveal key={tech.name} delay={0.2 + i * 0.05}>
                  <motion.div
                    className="p-6 rounded-xl border border-white/5 bg-[#111116] flex flex-col justify-center h-full group"
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(22, 22, 28, 1)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    transition={{ duration: 0.3, ease }}
                  >
                    <span className="text-xs font-medium tracking-wider text-white/30 mb-2 uppercase group-hover:text-[#00FF94]/70 transition-colors">
                      {tech.category}
                    </span>
                    <span className="text-lg font-medium text-white/90">
                      {tech.name}
                    </span>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
