'use client';

import { useState } from 'react';
import ErasmusCalculator from '@/components/ErasmusCalculator';
import ErasmusSelector from '@/components/ErasmusSelector';
import { useTranslations } from 'next-intl';

export default function ErasmusPageContent() {
  const t = useTranslations('ErasmusPage');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [hasBAfoeg, setHasBAfoeg] = useState<boolean>(false);

  const handleSelectionChange = (selection: {
    university: string;
    program: string;
    partner: any;
    hasBAfoeg: boolean;
  }) => {
    setSelectedUniversity(selection.university);
    setSelectedProgram(selection.program);
    setHasBAfoeg(selection.hasBAfoeg);
  };

  return (
    <div className="pb-32">
      <div className="max-w-7xl mx-auto mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {t('title')}
        </h1>
        <p className="text-white/70 text-lg">
          {t('subtitle')}
        </p>
      </div>
      
      {/* Cascading Dropdown Selector */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {t('selectorTitle')}
          </h2>
          <ErasmusSelector onSelectionChange={handleSelectionChange} />
        </div>
      </div>

      {/* Cost Calculator - Only shows when selections are made */}
      <ErasmusCalculator 
        selectedUniversity={selectedUniversity}
        selectedProgram={selectedProgram}
        hasBAfoeg={hasBAfoeg}
      />
    </div>
  );
}

