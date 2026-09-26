'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEraStore } from '@/store/useEraStore';

export function TuningIndicator() {
  const isTuning = useEraStore((state) => state.isTuning);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence>
        {isTuning && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0, scale: [1, 1.04, 1] }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{
              opacity: { duration: 0.2 },
              y: { duration: 0.2 },
              scale: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
            }}
            className="flex items-center gap-3 bg-black/85 backdrop-blur-md px-5 py-2.5 rounded-full border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.3)] text-amber-400 font-mono text-sm tracking-widest select-none"
          >
            {/* Ícono de ondas de radio */}
            <svg
              className="w-4 h-4 text-amber-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="18" r="1.5" fill="currentColor" />
              <motion.path
                d="M8.5 14.5a5 5 0 0 1 7 0"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
              />
              <motion.path
                d="M5.5 11.5a9.2 9.2 0 0 1 13 0"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.25 }}
              />
              <motion.path
                d="M2.5 8.5a13.5 13.5 0 0 1 19 0"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.5 }}
              />
            </svg>

            <span>SINTONIZANDO</span>

            {/* Puntos animados */}
            <span className="inline-flex w-4">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.1, 1, 0.1] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.25,
                    ease: 'easeInOut',
                  }}
                >
                  .
                </motion.span>
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TuningIndicator;
