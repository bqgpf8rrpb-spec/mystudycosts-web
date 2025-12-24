import StudyCostCalculator from '@/components/StudyCostCalculator';

export default function CalculatorPage() {
  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Study Cost Calculator
        </h1>
        <p className="text-white/70 text-lg">
          Calculate your monthly and annual study costs in Germany
        </p>
      </div>
      <StudyCostCalculator />
    </main>
  );
}
