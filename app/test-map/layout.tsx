import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function TestMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
