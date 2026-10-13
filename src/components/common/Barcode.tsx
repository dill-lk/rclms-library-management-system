import React from 'react';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  width = 180,
  height = 50,
  showText = true,
  className = '',
}) => {
  // Deterministic bar widths based on input string hash
  const getBars = (str: string) => {
    const bars: { width: number; space: number }[] = [];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % 100000;
    }

    const pattern = [2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 2, 1, 3, 1, 2, 3, 1, 2, 1, 2];
    for (let i = 0; i < 28; i++) {
      const idx = (hash + i * 7) % pattern.length;
      bars.push({
        width: pattern[idx] || 2,
        space: pattern[(idx + 1) % pattern.length] || 1,
      });
    }
    return bars;
  };

  const bars = getBars(value);

  return (
    <div className={`flex flex-col items-center bg-white p-2 rounded border border-gray-200 select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 200 60"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className="text-gray-900"
      >
        {/* Guard bars */}
        <rect x="10" y="5" width="2.5" height="50" fill="black" />
        <rect x="14" y="5" width="1.5" height="50" fill="black" />

        {/* Dynamic bar sequence */}
        {bars.map((bar, i) => {
          const x = 20 + i * 5.8;
          if (x > 175) return null;
          return (
            <rect
              key={i}
              x={x}
              y="5"
              width={bar.width * 0.9}
              height="45"
              fill="black"
            />
          );
        })}

        {/* End guard bars */}
        <rect x="180" y="5" width="1.5" height="50" fill="black" />
        <rect x="184" y="5" width="2.5" height="50" fill="black" />
      </svg>
      {showText && (
        <span className="font-mono text-xs tracking-wider font-semibold text-gray-800 mt-1">
          *{value}*
        </span>
      )}
    </div>
  );
};
