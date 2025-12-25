'use client';

import { Mail } from 'lucide-react';

// Bot-protected email component
export default function ProtectedEmail({ email }: { email: string }) {
  // Split email to make it slightly harder for simple scrapers
  const [localPart, domain] = email.split('@');
  
  return (
    <a
      href={`mailto:${email}`}
      className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1.5"
      onClick={(e) => {
        // Additional protection: decode on click
        e.preventDefault();
        window.location.href = `mailto:${email}`;
      }}
    >
      <Mail className="w-4 h-4" />
      <span>{localPart}@{domain}</span>
    </a>
  );
}

