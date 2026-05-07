'use client';

import { calculateAdmissionChance } from '@/lib/admission';
import Speedometer from '@/components/ui/Speedometer';
import { CheckCircle2, ArrowRight } from 'lucide-react';

// Helper functions for dynamic colors
function getStatusBgColor(color: string): string {
  const colorMap: Record<string, string> = {
    emerald: 'rgba(16, 185, 129, 0.1)', // emerald-500/10
    yellow: 'rgba(234, 179, 8, 0.1)', // yellow-500/10
    orange: 'rgba(249, 115, 22, 0.1)', // orange-500/10
    red: 'rgba(239, 68, 68, 0.1)', // red-500/10
  };
  return colorMap[color] || 'rgba(148, 163, 184, 0.1)';
}

function getStatusBorderColor(color: string): string {
  const colorMap: Record<string, string> = {
    emerald: 'rgba(16, 185, 129, 0.3)', // emerald-500/30
    yellow: 'rgba(234, 179, 8, 0.3)', // yellow-500/30
    orange: 'rgba(249, 115, 22, 0.3)', // orange-500/30
    red: 'rgba(239, 68, 68, 0.3)', // red-500/30
  };
  return colorMap[color] || 'rgba(148, 163, 184, 0.3)';
}

function getStatusTextColor(color: string): string {
  const colorMap: Record<string, string> = {
    emerald: '#34d399', // emerald-400
    yellow: '#fbbf24', // yellow-400
    orange: '#fb923c', // orange-400
    red: '#f87171', // red-400
  };
  return colorMap[color] || '#94a3b8';
}

interface AdmissionChancesProps {
  userGpa: number;
  ncThreshold: number | null; // NC threshold for public university
}

export default function AdmissionChances({
  userGpa,
  ncThreshold,
}: AdmissionChancesProps) {
  // Calculate admission chance for public university
  const publicChance = calculateAdmissionChance(userGpa, ncThreshold);

  // Alternative path (private/international) - always high
  const alternativeChance = {
    score: 95,
    label: 'Very High',
    color: 'emerald',
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          Admission Probability
        </h3>
        <p className="text-sm text-slate-400">
          Compare your chances: Public university vs. alternative paths
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Public University Path */}
        <div className="flex flex-col items-center">
          <div className="mb-4 text-center">
            <h4 className="text-lg font-semibold text-white mb-1">
              Public University Path
            </h4>
            {ncThreshold !== null ? (
              <p className="text-xs text-slate-500">
                NC Threshold: {ncThreshold.toFixed(2)} | Your GPA: {userGpa.toFixed(2)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                No NC (Open Admission)
              </p>
            )}
          </div>

          <Speedometer
            score={publicChance.score}
            label={publicChance.label}
            color={publicChance.color}
            size={220}
            showPercentage={true}
          />

          {/* Status indicator */}
          <div 
            className="mt-4 px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: getStatusBgColor(publicChance.color),
              borderColor: getStatusBorderColor(publicChance.color),
            }}
          >
            <p 
              className="text-sm font-medium"
              style={{ color: getStatusTextColor(publicChance.color) }}
            >
              {publicChance.label}
            </p>
          </div>
        </div>

        {/* Alternative Path */}
        <div className="flex flex-col items-center">
          <div className="mb-4 text-center">
            <h4 className="text-lg font-semibold text-white mb-1">
              Alternative Path
            </h4>
            <p className="text-xs text-slate-500">
              Private Universities & International Programs
            </p>
          </div>

          <Speedometer
            score={alternativeChance.score}
            label={alternativeChance.label}
            color={alternativeChance.color}
            size={220}
            showPercentage={true}
          />

          {/* Status indicator */}
          <div className="mt-4 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400">
                Flexible Admission
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => {
              // TODO: Navigate to eligibility check or private university search
              console.log('Check eligibility clicked');
            }}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
          >
            <span>Check Eligibility</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comparison note */}
      <div className="mt-8 pt-6 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          <strong className="text-slate-400">Note:</strong> Public universities use NC (Numerus Clausus) 
          thresholds that can change yearly. Alternative paths (private universities, international programs) 
          typically offer more flexible admission criteria.
        </p>
      </div>
    </div>
  );
}

