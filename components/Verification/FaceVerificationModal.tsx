import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlertIcon, FingerprintIcon, CameraIcon } from '../icons';
import { User } from '../../types';
import { simulateBiometricComparison } from '../../services/databaseService';

interface FaceVerificationModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: (capturedImage: string) => void;
}

const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({ isOpen, user, onClose, onSuccess, onFailure }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

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

  const handleVerify = async () => {
    if (!videoRef.current || !canvasRef.current || !user.faceReferenceImage) return;
    setVerifying(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
        // Flip the image horizontally to match the user's view
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    }

    const capturedImage = canvas.toDataURL('image/jpeg', 0.8);
    
    try {
        const isMatch = await simulateBiometricComparison(user.faceReferenceImage, capturedImage);
        
        if(isMatch) {
            onSuccess();
        } else {
            onFailure(capturedImage);
        }
    } catch(e) {
        console.error("Biometric comparison failed", e);
        setError("Could not complete verification. Please try again.");
    } finally {
        setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-sm w-full relative">
        <canvas ref={canvasRef} className="hidden"></canvas>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
        <div className="text-center">
            <ShieldAlertIcon className="mx-auto w-12 h-12 text-orange-400 mb-4" />
            <h2 className="text-2xl font-bold text-orange-400">Biometric Verification</h2>
            <p className="text-gray-300 mt-2">Position your face in the frame to proceed.</p>
        </div>
        <div className="mt-6">
            <div className="w-full h-48 bg-gray-900 rounded-md flex items-center justify-center overflow-hidden">
                {error ? (
                    <p className="text-red-400 text-center text-sm p-4">{error}</p>
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
                )}
            </div>
            
            <button onClick={handleVerify} disabled={!!error || verifying} className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed">
                {verifying ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                    </>
                ) : (
                    <>
                        <CameraIcon className="mr-2 w-5 h-5" />
                        Capture & Verify
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default FaceVerificationModal;