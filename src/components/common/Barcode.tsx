import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();
    setIsValid(true);
    if (!value.trim()) {
      setIsValid(false);
      return;
    }

    try {
      const numericCode = /^\d{4,}$/.test(value.trim());
      const estimatedModules = numericCode
        ? 35 + Math.ceil(value.trim().length / 2) * 11
        : 35 + value.trim().length * 11;
      const moduleWidth = Math.max(1, Math.min(3, (width - 12) / Math.max(1, estimatedModules)));
      JsBarcode(svg, value, {
        format: 'CODE128',
        lineColor: '#0B0A08',
        background: '#FFFFFF',
        width: moduleWidth,
        height: Math.max(24, height),
        displayValue: false,
        margin: 6,
        valid: (valid) => setIsValid(valid),
      });
    } catch {
      setIsValid(false);
    }
  }, [height, value, width]);

  return (
    <div
      className={`flex max-w-full flex-col items-center border border-gray-200 bg-white p-2 select-none ${className}`}
      style={{ maxWidth: width }}
      role="img"
      aria-label={isValid ? `Code 128 barcode for ${value}` : 'Invalid barcode value'}
    >
      <svg ref={svgRef} className="block h-auto max-w-full" style={{ maxHeight: height + 12 }} aria-hidden="true" />
      {showText && (
        <span className="mt-1 max-w-full break-all text-center text-xs font-semibold tracking-wide text-gray-900">
          {value}
        </span>
      )}
      {!isValid && <span className="text-[10px] text-red-700">Invalid barcode value</span>}
    </div>
  );
};
