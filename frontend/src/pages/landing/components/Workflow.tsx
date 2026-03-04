import { motion, type Easing } from 'framer-motion';
import Reveal from './Reveal';

const ease: Easing = [0.77, 0, 0.175, 1];

const steps = [
  {
    id: '01',
    title: 'SCRAPE',
    description: 'Collect jobs from multiple platforms using automated scrapers.',
    col: 'lg:col-span-4',
  },
  {
    id: '02',
    title: 'MATCH',
    description: 'Compute semantic similarity using pgvector embeddings to find the perfect fit.',
    col: 'lg:col-span-4',
  },
  {
    id: '03',
    title: 'TAILOR',
    description: 'Generate highly optimized, job-specific resumes tailored with advanced LLMs.',
    col: 'lg:col-span-4',
  },
  {
    id: '04',
    title: 'APPLY',
    description: 'Automate repetitive form submission across portals via Playwright.',
    col: 'lg:col-span-6',
  },
  {
    id: '05',
    title: 'TRACK',
    description: 'Monitor application states with full deterministic logging and screenshot auditing.',
    col: 'lg:col-span-6',
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="relative py-32 bg-[#0B0B0F]">
      <div className="hire-container">
        <Reveal>
          <div className="mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4">
              Core Architecture
            </h2>
            <p className="text-white/50 text-lg max-w-2xl">
              A robust deterministic pipeline handling everything from job discovery to application delivery.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {steps.map((step, i) => (
            <Reveal
              key={step.id}
              delay={i * 0.1}
              className={`group ${step.col}`}
            >
              <motion.div
                className="h-full p-8 rounded-2xl border border-white/5 bg-[#111116] transition-colors duration-500 hover:bg-[#16161C] hover:border-white/10"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.4, ease }}
              >
                <div className="text-xs font-semibold tracking-widest text-[#00FF94] mb-8">
                  STEP {step.id}
                </div>
                <h3 className="text-xl font-semibold tracking-wide text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
