'use client';

import { useTranslations } from 'next-intl';
import type { FAQItem } from '@/lib/schema/faq';
import { generateFAQSchema } from '@/lib/schema/faq';

interface FAQProps {
  items: FAQItem[];
  title?: string;
  id?: string;
  useAccordion?: boolean;
}

export default function FAQ({ items, title, id = 'faq', useAccordion = true }: FAQProps) {
  const t = useTranslations('FAQ');
  const headingText = title ?? t('title');

  const schema = generateFAQSchema(items);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <section id={id} aria-labelledby="faq-heading" className="space-y-4">
        <h2 id="faq-heading" className="text-2xl font-bold text-white mb-6">
          {headingText}
        </h2>
        {useAccordion ? (
          <dl className="space-y-4">
            {items.map((item, index) => (
              <article key={index} className="border-b border-slate-700 pb-4 last:border-0">
                <details className="group">
                  <summary className="cursor-pointer list-none flex items-start gap-2 py-2">
                    <span className="text-blue-400 group-open:rotate-90 transition-transform">›</span>
                    <dt className="text-lg font-semibold text-white">
                      {item.question}
                    </dt>
                  </summary>
                  <dd className="mt-2 pl-6 text-slate-400 leading-relaxed">
                    {item.answer}
                  </dd>
                </details>
              </article>
            ))}
          </dl>
        ) : (
          <dl className="space-y-6">
            {items.map((item, index) => (
              <div key={index}>
                <dt className="text-lg font-semibold text-white mb-2">{item.question}</dt>
                <dd className="text-slate-400 leading-relaxed pl-4 border-l-2 border-slate-600">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </>
  );
}
