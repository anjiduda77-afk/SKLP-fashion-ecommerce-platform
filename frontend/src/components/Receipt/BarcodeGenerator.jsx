import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * Dynamic SVG Barcode Generator (CODE128)
 * Printable, high-contrast, scalable
 */
export default function BarcodeGenerator({
  value,
  height = 48,
  width = 1.8,
  displayValue = true,
  className = ''
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format: 'CODE128',
          lineColor: '#000000',
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: 11,
          font: 'monospace',
          textMargin: 2,
          margin: 4,
          background: '#ffffff'
        });
      } catch (err) {
        console.warn('Barcode generation failed for:', value, err);
      }
    }
  }, [value, height, width, displayValue]);

  if (!value) return null;

  return (
    <div className={`inline-block bg-white p-1 rounded border border-black/10 ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto block" />
    </div>
  );
}
