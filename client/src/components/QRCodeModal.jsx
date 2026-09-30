import { QRCodeSVG } from "qrcode.react";

export default function QRCodeModal({ isOpen, onClose, title, url }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#121824] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold bg-transparent border-none cursor-pointer"
        >
          ✕
        </button>

        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold border border-emerald-500/30">
          ✓
        </div>

        <h3 className="text-lg font-bold text-white mb-1">{title || "Credential Verification QR"}</h3>
        <p className="text-xs text-gray-400 mb-6">Scan this QR code with any mobile device to view instant on-chain verification proof.</p>

        <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-4">
          <QRCodeSVG value={url} size={180} level="H" includeMargin={true} />
        </div>

        <p className="text-[11px] font-mono text-gray-400 break-all bg-white/5 p-2 rounded-lg border border-white/10 mb-4">
          {url}
        </p>

        <button
          onClick={() => {
            navigator.clipboard.writeText(url);
            alert("Verification link copied to clipboard!");
          }}
          className="w-full bg-gradient-to-r from-emerald-400 to-indigo-600 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition-all hover:opacity-90 cursor-pointer border-none shadow-md"
        >
          Copy Verification Link
        </button>
      </div>
    </div>
  );
}
