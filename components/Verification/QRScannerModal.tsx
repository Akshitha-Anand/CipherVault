import React, { useState, useEffect, useRef } from 'react';
import { QrCodeIcon, ScanLineIcon } from '../icons';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedValue: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const startCamera = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setError(null);
        } catch (err) {
          console.error("Camera access denied:", err);
          setError("Camera access is required. Please enable it in your browser settings.");
        }
      };
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const handleScan = () => {
    // In a real app, a library like jsQR would decode the video stream.
    // Here, we simulate a successful scan with mock data.
    const mockUPI = `upi://pay?pa=recipient${Date.now()}@okbank&pn=Mock%20Recipient`;
    onScan(mockUPI);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
        <div className="text-center">
            <QrCodeIcon className="mx-auto w-12 h-12 text-cyan-400 mb-4" />
            <h2 className="text-2xl font-bold text-cyan-400">Scan QR Code</h2>
            <p className="text-gray-300 mt-2">Point your camera at a UPI QR code to automatically fill recipient details.</p>
        </div>
        <div className="mt-6">
            <div className="w-full aspect-square bg-gray-900 rounded-md flex items-center justify-center overflow-hidden relative">
                {error ? (
                    <p className="text-red-400 text-center text-sm p-4">{error}</p>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3/4 h-3/4 border-4 border-dashed border-white/50 rounded-lg"></div>
                        </div>
                    </>
                )}
            </div>
            <button onClick={handleScan} disabled={!!error} className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed">
                <ScanLineIcon className="mr-2 w-5 h-5" />
                Simulate Scan
            </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;