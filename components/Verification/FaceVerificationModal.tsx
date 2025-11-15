import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlertIcon, FingerprintIcon } from '../icons';

interface FaceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const startCamera = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setError(null);
        } catch (err) {
          console.error("Camera access denied:", err);
          setError("Camera access is required for biometric verification. Please enable it in your browser settings.");
        }
      };
      startCamera();
    } else {
      // Cleanup: stop the camera stream when the modal is closed
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    // Cleanup function to run when the component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const handleSuccess = () => {
    // In a real app, you would capture a frame and send it for verification
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-sm w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
        <div className="text-center">
            <ShieldAlertIcon className="mx-auto w-12 h-12 text-orange-400 mb-4" />
            <h2 className="text-2xl font-bold text-orange-400">Biometric Verification</h2>
            <p className="text-gray-300 mt-2">A high-risk transaction was detected. Please position your face in the frame to proceed.</p>
        </div>
        <div className="mt-6">
            <div className="w-full h-48 bg-gray-900 rounded-md flex items-center justify-center overflow-hidden">
                {error ? (
                    <p className="text-red-400 text-center text-sm p-4">{error}</p>
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
                )}
            </div>
            <button onClick={handleSuccess} disabled={!!error} className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed">
                <FingerprintIcon className="mr-2 w-5 h-5" />
                Verify Identity
            </button>
        </div>
      </div>
    </div>
  );
};

export default FaceVerificationModal;