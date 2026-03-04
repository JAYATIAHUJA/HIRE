import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Easing } from 'framer-motion';
import { Link } from 'react-router-dom';

const ease: Easing = [0.77, 0, 0.175, 1];

const navLinks = [
  { label: 'Workflow', href: '#workflow' },
  { label: 'Technology', href: '#technology' },
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'GitHub', href: 'https://github.com/JAYATIAHUJA/HIRE', external: true },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Intersection Observer for active section
  useEffect(() => {
    const ids = ['workflow', 'technology', 'dashboard'];
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('#')) {
      const el = document.getElementById(href.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/[0.04]'
          : 'bg-transparent'
      }`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease }}
    >
      <div className="hire-container flex items-center justify-between h-16 md:h-18">
        {/* Logo */}
        <Link
          to="/"
          className="text-white font-semibold text-lg tracking-tight select-none"
        >
          HIRE
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.external ? link.href : undefined}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              onClick={!link.external ? () => handleNavClick(link.href) : undefined}
              className={`relative text-sm font-medium tracking-wide cursor-pointer transition-colors duration-300 ${
                activeSection === link.href?.slice(1)
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {link.label}
              {activeSection === link.href?.slice(1) && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 left-0 right-0 h-px bg-[#00FF94]"
                  transition={{ duration: 0.4, ease }}
                />
              )}
            </a>
          ))}

          <Link
            to="/onboarding"
            className="text-sm font-medium px-5 py-2 rounded-lg bg-white text-[#0B0B0F] hover:bg-[#00FF94] transition-colors duration-300"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden relative w-6 h-5 flex flex-col justify-between"
          aria-label="Toggle menu"
        >
          <motion.span
            className="block w-full h-px bg-white origin-left"
            animate={mobileOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.3, ease }}
          />
          <motion.span
            className="block w-full h-px bg-white"
            animate={{ opacity: mobileOpen ? 0 : 1 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="block w-full h-px bg-white origin-left"
            animate={mobileOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.3, ease }}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="md:hidden overflow-hidden bg-[#0B0B0F]/95 backdrop-blur-xl border-b border-white/[0.04]"
          >
            <div className="hire-container py-6 flex flex-col gap-5">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.external ? link.href : undefined}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  onClick={!link.external ? () => handleNavClick(link.href) : undefined}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.4, ease }}
                  className="text-white/60 hover:text-white text-lg font-medium cursor-pointer transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
              <Link
                to="/onboarding"
                onClick={() => setMobileOpen(false)}
                className="text-center text-sm font-medium px-5 py-3 rounded-lg bg-white text-[#0B0B0F] hover:bg-[#00FF94] transition-colors duration-300 mt-2"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
