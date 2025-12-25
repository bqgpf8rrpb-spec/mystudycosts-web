import Link from 'next/link';
import { Calculator, Home } from 'lucide-react';

export default function NotFound() {
  // Default to 'en' for 404 page (locale will be preserved by browser)
  const locale = 'en';
  const basePath = `/${locale}`;

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Card */}
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 sm:p-12">
          <div className="mb-8">
            <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
              404
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Page Not Found
            </h1>
            <p className="text-white/70 text-lg mb-8">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`${basePath}/calculator`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              <Calculator className="w-5 h-5" />
              Back to Calculator
            </Link>
            <Link
              href={basePath}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors duration-200 border border-white/10"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

