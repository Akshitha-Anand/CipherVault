import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlertIcon, CheckCircle2, ShieldXIcon, CameraIcon } from '../icons';
import { User } from '../../types';
import { verifyFaceWithAI } from '../../services/databaseService';

interface FaceVerificationModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: (capturedImage: string) => void;
}

type VerificationStatus = 'PENDING' | 'VERIFYING' | 'SUCCESS' | 'FAILED';

const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({ isOpen, user, onClose, onSuccess, onFailure }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationStatus>('PENDING');
  const [challenge, setChallenge] = useState<'SMILE' | 'BLINK'>('SMILE');
  const [failureReason, setFailureReason] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setStatus('PENDING');
      setError(null);
      setFailureReason('');
      setChallenge(Math.random() > 0.5 ? 'SMILE' : 'BLINK');

      const startCamera = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
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
    if (!videoRef.current || !canvasRef.current) return;
    setStatus('VERIFYING');
    
    if (!user.faceReferenceImages || user.faceReferenceImages.length === 0) {
        setError("No reference face data found for this user. Cannot verify.");
        setStatus('FAILED');
        return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.setTransform(1, 0, 0, 1, 0, 0);
    }

    const capturedImage = canvas.toDataURL('image/jpeg', 0.8);
    
    try {
        const result = await verifyFaceWithAI(user.faceReferenceImages, capturedImage, challenge);
        
        if(result.match) {
            setStatus('SUCCESS');
            setTimeout(() => onSuccess(), 2000);
        } else {
            setFailureReason(result.reason);
            setStatus('FAILED');
            setTimeout(() => onFailure(capturedImage), 3000);
        }
    } catch(e) {
        console.error("Biometric comparison failed", e);
        setFailureReason("A system error occurred during verification.");
        setStatus('FAILED');
    }
  };
  
  const renderContent = () => {
    switch(status) {
        case 'VERIFYING':
            return (
                <div className="text-center">
                    <svg className="animate-spin mx-auto h-12 w-12 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg font-semibold text-cyan-300">Verifying Identity & Liveness...</p>
                </div>
            );
        case 'SUCCESS':
            return (
                <div className="text-center">
                    <CheckCircle2 className="mx-auto w-12 h-12 text-green-400 mb-4" />
                    <h2 className="text-2xl font-bold text-green-400">Verification Successful</h2>
                </div>
            )
        case 'FAILED':
             return (
                <div className="text-center">
                    <ShieldXIcon className="mx-auto w-12 h-12 text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold text-red-400">Verification Failed</h2>
                    <p className="text-gray-300 mt-2">{failureReason || "Could not match face."}</p>
                </div>
            )
        case 'PENDING':
        default:
            return (
                 <>
                    <div className="text-center">
                        <ShieldAlertIcon className="mx-auto w-12 h-12 text-orange-400 mb-4" />
                        <h2 className="text-2xl font-bold text-orange-400">Biometric Verification</h2>
                        <p className="text-gray-300 mt-2">
                            Please <span className="font-bold text-white">{challenge}</span> for the camera to proceed.
                        </p>
                    </div>
                    <div className="mt-6">
                        <div className="w-full h-48 bg-gray-900 rounded-md flex items-center justify-center overflow-hidden">
                            {error ? (
                                <p className="text-red-400 text-center text-sm p-4">{error}</p>
                            ) : (
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
                            )}
                        </div>
                        
                        <button onClick={handleVerify} disabled={!!error} className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed">
                            <CameraIcon className="mr-2 w-5 h-5" />
                            Capture & Verify
                        </button>
                    </div>
                </>
            );
    }
  }


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-sm w-full relative min-h-[380px] flex flex-col justify-center">
        <canvas ref={canvasRef} className="hidden"></canvas>
        {status === 'PENDING' && <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>}
        {renderContent()}
      </div>
    </div>
  );
};

export default FaceVerificationModal;