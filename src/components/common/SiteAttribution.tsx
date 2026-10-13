import React from 'react';

export const SiteAttribution: React.FC<{ className?: string }> = ({ className = '' }) => (
  <a
    href="https://hello.dill.dev"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Systems by Jinuk Chanthusa — hello.dill.dev"
    className={`text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 ${className}`}
  >
    Systems by Jinuk Chanthusa
  </a>
);
