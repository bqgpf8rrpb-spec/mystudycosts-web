'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Award, AlertCircle, Info } from 'lucide-react';

interface GradeInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  showSlider?: boolean;
  className?: string;
}

export default function GradeInput({ 
  value, 
  onChange, 
  showSlider = true,
  className = '' 
}: GradeInputProps) {
  const t = useTranslations('GradeInput');
  const [inputValue, setInputValue] = useState<string>(value?.toFixed(1) || '');
  const [error, setError] = useState<string>('');

  // Sync input value when prop changes
  useEffect(() => {
    if (value !== null) {
      setInputValue(value.toFixed(1));
    } else {
      setInputValue('');
    }
  }, [value]);

  const validateAndSetGrade = (newValue: string) => {
    setInputValue(newValue);
    
    // Allow empty input
    if (newValue === '') {
      setError('');
      onChange(null);
      return;
    }

    // Parse the input
    const numValue = parseFloat(newValue);
    
    // Check if it's a valid number
    if (isNaN(numValue)) {
      setError(t('invalidNumber'));
      onChange(null);
      return;
    }

    // Check range (0.7 to 4.0 for German grading system - allows exceptional grades)
    if (numValue < 0.7 || numValue > 4.0) {
      setError(t('outOfRange'));
      onChange(null);
      return;
    }

    // Check decimal places (max 1 decimal)
    const decimalParts = newValue.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 1) {
      setError(t('tooManyDecimals'));
      onChange(null);
      return;
    }

    // Valid input
    setError('');
    onChange(numValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    validateAndSetGrade(newValue);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseFloat(e.target.value);
    setInputValue(sliderValue.toFixed(1));
    setError('');
    onChange(sliderValue);
  };

  const handleBlur = () => {
    // Round to 1 decimal place on blur
    if (inputValue && !error) {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue) && numValue >= 0.7 && numValue <= 4.0) {
        setInputValue(numValue.toFixed(1));
      }
    }
  };

  return (
    <div className={`backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 ${className}`}>
      <label className="block mb-3 text-sm font-medium text-white/80 flex items-center gap-2">
        <Award className="w-4 h-4" />
        {t('label')}
      </label>
      
      <div className="space-y-3">
        {/* Number Input */}
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={t('placeholder')}
            className={`w-full bg-black/40 border ${
              error 
                ? 'border-red-500/50 focus:ring-red-500' 
                : 'border-white/10 focus:ring-blue-500'
            } rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-lg font-medium`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
            {t('maxGrade')}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Text */}
        <div className="flex items-start gap-2">
          <Info className="w-3 h-3 text-white/60 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-white/60">
            {t('info')}
          </p>
        </div>
        
        {/* Exceptional Grades Info */}
        <div className="flex items-start gap-2 bg-blue-950/30 border border-blue-500/20 rounded-lg p-2">
          <Info className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-300/80">
            {t('exceptionalGradesInfo')}
          </p>
        </div>

        {/* Slider (Optional) */}
        {showSlider && (
          <div className="pt-2">
            <label className="block text-xs text-white/60 mb-2">
              {t('sliderLabel')}
            </label>
            <div className="relative">
              <input
                type="range"
                min="0.7"
                max="4.0"
                step="0.1"
                value={value || 2.5}
                onChange={handleSliderChange}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-800 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-800 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                style={{
                  background: value 
                    ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((value - 0.7) / 3.3) * 100}%, #475569 ${((value - 0.7) / 3.3) * 100}%, #475569 100%)`
                    : 'linear-gradient(to right, #3b82f6 0%, #3b82f6 50%, #475569 50%, #475569 100%)'
                }}
              />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>0.7</span>
                <span>2.35</span>
                <span>4.0</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

