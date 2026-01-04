import ErasmusPageContent from '@/components/ErasmusPageContent';

export default async function ErasmusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4">
      <ErasmusPageContent />
    </main>
  );
}
