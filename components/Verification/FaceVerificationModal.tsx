


import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlertIcon, CheckCircle2, ShieldXIcon, CameraIcon, ProcessingSpinner } from '../icons';
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
  const [failureReason, setFailureReason] = useState<string>('');
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  const verificationStepIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setStatus('PENDING');
      setError(null);
      setFailureReason('');
      setVerificationMessage('');

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
      if (verificationStepIntervalRef.current) {
          // FIX: Use window.clearInterval to avoid type conflicts with Node's Timeout type.
          window.clearInterval(verificationStepIntervalRef.current);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (verificationStepIntervalRef.current) {
          // FIX: Use window.clearInterval to avoid type conflicts with Node's Timeout type.
          window.clearInterval(verificationStepIntervalRef.current);
      }
    };
  }, [isOpen]);
  
  const captureFrame = (): string | null => {
      if (!videoRef.current || !canvasRef.current) return null;
      
      const video = videoRef.current;
      const mainCanvas = canvasRef.current;
      mainCanvas.width = video.videoWidth;
      mainCanvas.height = video.videoHeight;
      const mainContext = mainCanvas.getContext('2d');

      if (!mainContext) return null;
      
      // Draw mirrored video to main canvas
      mainContext.translate(mainCanvas.width, 0);
      mainContext.scale(-1, 1);
      mainContext.drawImage(video, 0, 0, mainCanvas.width, mainCanvas.height);
      mainContext.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

      // --- RESIZING LOGIC ---
      const MAX_DIMENSION = 512;
      let targetWidth = mainCanvas.width;
      let targetHeight = mainCanvas.height;

      if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round(targetHeight * (MAX_DIMENSION / targetWidth));
          targetWidth = MAX_DIMENSION;
        } else {
          targetWidth = Math.round(targetWidth * (MAX_DIMENSION / targetHeight));
          targetHeight = MAX_DIMENSION;
        }
      }

      // Use an offscreen canvas for resizing
      const resizeCanvas = document.createElement('canvas');
      resizeCanvas.width = targetWidth;
      resizeCanvas.height = targetHeight;
      const resizeContext = resizeCanvas.getContext('2d');
      
      if (!resizeContext) return null;

      resizeContext.drawImage(mainCanvas, 0, 0, targetWidth, targetHeight);
      
      return resizeCanvas.toDataURL('image/jpeg', 0.8);
  }

  const handleVerify = async () => {
    if (!user.faceReferenceImages || user.faceReferenceImages.length === 0) {
        const reason = "No reference face data. Transaction cannot be verified.";
        setFailureReason(reason);
        setStatus('FAILED');
        setTimeout(() => onClose(), 3000); // Close modal, which flags transaction
        return;
    }

    setStatus('VERIFYING');
    
    // Start verification message cycle immediately
    const verificationSteps = [
        "Capturing Biometrics...",
        "Analyzing Facial Vectors...",
        "Comparing Signatures...",
        "Finalizing Result..."
    ];
    let stepIndex = 0;

    const updateMessage = () => {
        setVerificationMessage(verificationSteps[stepIndex]);
        stepIndex = (stepIndex + 1) % verificationSteps.length;
    };
    updateMessage();
    // FIX: Use window.setInterval to avoid type conflicts with Node's Timeout type.
    verificationStepIntervalRef.current = window.setInterval(updateMessage, 1500);
    
    const liveImage = captureFrame();
    if (!liveImage) {
        setFailureReason("Could not capture image from camera.");
        setStatus('FAILED');
        setTimeout(() => onFailure(''), 1000); // Pass empty string if capture fails
        return;
    }

    try {
        // FIX: Pass the single captured liveImage to the verification function.
        const result = await verifyFaceWithAI(user.faceReferenceImages, liveImage);
        
        // FIX: Use window.clearInterval to avoid type conflicts with Node's Timeout type.
        if (verificationStepIntervalRef.current) window.clearInterval(verificationStepIntervalRef.current);
        
        if(result.match) {
            setStatus('SUCCESS');
            setTimeout(() => onSuccess(), 250);
        } else {
            setFailureReason(result.reason);
            setStatus('FAILED');
            // FIX: Pass the single failed image to the onFailure handler.
            setTimeout(() => onFailure(liveImage), 1000);
        }
    } catch(e) {
        // FIX: Use window.clearInterval to avoid type conflicts with Node's Timeout type.
        if (verificationStepIntervalRef.current) window.clearInterval(verificationStepIntervalRef.current);
        console.error("Biometric comparison failed", e);
        setFailureReason("A system error occurred during verification.");
        setStatus('FAILED');
        setTimeout(() => onFailure(liveImage), 1000);
    }
  };
  
  const renderContent = () => {
    switch(status) {
        case 'VERIFYING':
            return (
                <div className="text-center">
                    <ProcessingSpinner className="mx-auto h-16 w-16" />
                    <p className="mt-4 text-lg font-semibold text-cyan-300 transition-opacity duration-300 h-6">
                        {verificationMessage}
                    </p>
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
                           Please look straight into the camera and hold still.
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
                        
                        <button onClick={handleVerify} disabled={!!error || !stream} className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed">
                            <CameraIcon className="mr-2 w-5 h-5" />
                            Start Verification
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