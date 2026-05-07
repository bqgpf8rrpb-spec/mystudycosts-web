'use client';

/**
 * @deprecated Archived - replaced by NCDataDisclaimer. Kept for reference.
 */
export default function DataDisclaimer() {
  return (
    <div className="border-l-2 border-amber-500/50 bg-amber-500/5 p-4 my-6 text-[11px] text-slate-400 space-y-3">
      {/* NC Disclaimer */}
      <div>
        <p>
          <strong className="text-slate-300">NC Disclaimer:</strong> The displayed NC (grade cutoff) values refer to historical data and forecasts for 2026. They serve as guidance and are not legally binding. Final admission is determined solely by the respective university.
        </p>
      </div>

      {/* Cost Disclaimer */}
      <div>
        <p>
          <strong className="text-slate-300">Cost Disclaimer:</strong> The calculated monthly fixed costs are estimates based on market data from January 2026. Individual deviations due to inflation, personal lifestyle, or short-term fee increases by student services are possible.
        </p>
      </div>
    </div>
  );
}
