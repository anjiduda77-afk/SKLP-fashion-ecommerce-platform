import { QRCodeSVG } from 'qrcode.react';

/**
 * Dynamic SVG QR Code Generator
 * Points to secure order tracking URL.
 * Scalable for thermal/A4 printing and PDF export.
 */
export default function QRCodeGenerator({
  value,
  size = 80,
  level = 'M',
  className = ''
}) {
  if (!value) return null;

  return (
    <div className={`inline-flex flex-col items-center bg-white p-1 rounded border border-black/10 ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        includeMargin={true}
        fgColor="#000000"
        bgColor="#ffffff"
      />
      <span className="text-[7.5px] uppercase font-mono tracking-wider font-semibold text-black/60 mt-0.5">
        Scan to Track
      </span>
    </div>
  );
}
