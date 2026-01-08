'use client';

import { useEffect } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { motion } from 'framer-motion';

interface CostCounterProps {
  value: number;
  duration?: number;
  color?: 'emerald' | 'cyan'; // Default: emerald
}

export default function CostCounter({ value, duration = 1.5, color = 'emerald' }: CostCounterProps) {
  // Motion value that will animate from 0 to value
  const motionValue = useMotionValue(0);
  
  // Spring animation with easeOut easing
  const spring = useSpring(motionValue, {
    duration: duration * 1000, // Convert to milliseconds
    damping: 25,
    stiffness: 100,
  });
  
  // Transform the spring value to a rounded integer (no decimal places during animation)
  const displayValue = useTransform(spring, (latest: number) => Math.round(latest));
  
  // Animate from 0 to value when component mounts or value changes
  useEffect(() => {
    motionValue.set(0);
    const timeout = setTimeout(() => {
      motionValue.set(value);
    }, 10); // Small delay to ensure smooth start
    
    return () => clearTimeout(timeout);
  }, [value, motionValue]);
  
  const colorClass = color === 'cyan' ? 'text-cyan-400' : 'text-emerald-400';
  
  return (
    <motion.div 
      className="flex items-baseline gap-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.span
        className={`text-2xl font-bold ${colorClass} tabular-nums`}
      >
        {displayValue}
      </motion.span>
      <span className={`text-2xl font-bold ${colorClass}`}>€</span>
    </motion.div>
  );
}

