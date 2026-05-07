'use client';

interface TermDefinitionProps {
  term: string;
  definition: string;
  as?: 'abbr' | 'dfn';
}

export default function TermDefinition({ term, definition, as = 'abbr' }: TermDefinitionProps) {
  if (as === 'abbr') {
    return (
      <abbr title={definition} className="cursor-help border-b border-dotted border-slate-500">
        {term}
      </abbr>
    );
  }
  return (
    <dfn title={definition} className="cursor-help border-b border-dotted border-slate-500">
      {term}
    </dfn>
  );
}
