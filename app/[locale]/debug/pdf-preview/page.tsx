import { notFound } from 'next/navigation';
import { StudyReportPreview } from '@/components/export/StudyReportPDF';
import { buildStudyCostExportPayload } from '@/lib/export-utils';

export default function PdfPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const payload = buildStudyCostExportPayload({
    locale: 'de',
    currencyCode: 'EUR',
    university: 'Technische Universitat Munchen',
    city: 'Munich',
    countryOfOrigin: 'India',
    housingType: 'WG',
    monthlyTotal: '1.420 EUR',
    annualTotal: '17.040 EUR',
    upfrontTotal: '12.650 EUR',
    firstYearTotal: '29.690 EUR',
    costBreakdown: [
      { label: 'Average Rent', value: '750 EUR' },
      { label: 'Health Insurance', value: '140 EUR' },
      { label: 'Rundfunkbeitrag', value: '18 EUR' },
      { label: 'Semester Fee (monthly)', value: '22 EUR' },
      { label: 'Living Expenses', value: '490 EUR' },
      { label: 'Monthly Total', value: '1.420 EUR' },
    ],
    recommendationItems: [
      'Apply to your university and confirm admission timeline.',
      'Open blocked account and keep visa documents ready.',
      'Start accommodation search early for high-demand cities.',
      'Prepare health insurance confirmation for enrollment.',
    ],
  });

  return (
    <main className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto mb-4 max-w-4xl">
        <h1 className="text-2xl font-bold text-white">Debug: PDF Preview</h1>
        <p className="mt-1 text-sm text-slate-300">
          Developer view for quickly iterating the PDF layout without downloading a file.
        </p>
      </div>
      <StudyReportPreview payload={payload} />
    </main>
  );
}
