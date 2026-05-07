'use client';

import { motion } from 'framer-motion';

type OnboardingHintProps = {
  text: string;
  buttonLabel: string;
  onDismiss: () => void;
};

export default function OnboardingHint({ text, buttonLabel, onDismiss }: OnboardingHintProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="absolute right-0 top-14 z-[60] w-72 rounded-xl border border-blue-400/40 bg-slate-900/95 p-3 shadow-2xl shadow-blue-900/30 backdrop-blur-sm"
    >
      <motion.div
        className="pointer-events-none absolute -top-2 right-3 h-3 w-3 rotate-45 border-l border-t border-blue-400/40 bg-slate-900/95"
        animate={{ y: [0, -2, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="pointer-events-none absolute -right-1 top-4 h-2.5 w-2.5 rounded-full bg-blue-400/70"
        animate={{ scale: [1, 1.5, 1], opacity: [0.9, 0.3, 0.9] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <p className="text-xs leading-relaxed text-blue-100">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
      >
        {buttonLabel}
      </button>
    </motion.div>
  );
}
