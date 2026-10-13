import React from 'react';

interface CollegeCrestProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  lightMode?: boolean;
  className?: string;
}

export const CollegeCrest: React.FC<CollegeCrestProps> = ({
  size = 'md',
  showText = true,
  lightMode = false,
  className = '',
}) => {
  const sizeMap = {
    sm: { img: 'w-8 h-10', title: 'text-sm font-bold tracking-tight', sub: 'text-[10px]' },
    md: { img: 'w-10 h-12', title: 'text-base font-bold tracking-tight', sub: 'text-[11px]' },
    lg: { img: 'w-12 h-16', title: 'text-lg font-extrabold tracking-tight', sub: 'text-xs' },
    xl: { img: 'w-16 h-20', title: 'text-2xl font-black tracking-tight', sub: 'text-sm' },
  };

  const { img, title, sub } = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official College Emblem Image */}
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <img
          src="/logo.png"
          alt="Rahula College Crest"
          className={`${img} object-contain drop-shadow-md transition-transform duration-300 hover:scale-105`}
        />
      </div>

      {showText && (
        <div className="flex flex-col select-none">
          <div className="flex items-center gap-2">
            <span
              className={`font-heading ${title} ${
                lightMode ? 'text-white' : 'text-neutral-900 dark:text-white'
              }`}
            >
              Rahula College
            </span>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                lightMode
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-red-950/10 dark:bg-red-900/40 text-red-900 dark:text-amber-300 border border-red-900/20 dark:border-amber-400/20'
              }`}
            >
              LMS
            </span>
          </div>
          <span
            className={`font-medium tracking-wide ${sub} ${
              lightMode ? 'text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            Digital Library & Resource Hub
          </span>
        </div>
      )}
    </div>
  );
};
