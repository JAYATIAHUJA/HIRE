import { useRef } from 'react';
import { motion, useInView, type Easing } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
  once?: boolean;
}

const ease: Easing = [0.77, 0, 0.175, 1];

export default function Reveal({
  children,
  delay = 0,
  duration = 1,
  y = 40,
  className = '',
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration, delay, ease }}
    >
      {children}
    </motion.div>
  );
}
