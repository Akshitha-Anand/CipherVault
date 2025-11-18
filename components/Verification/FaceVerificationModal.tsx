import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlertIcon, CheckCircle2, ShieldXIcon, CameraIcon, ProcessingSpinner, UserIcon, UserCheckIcon } from '../icons';
import { User, Transaction } from '../../types';
import geminiService from '../../services/geminiService';

interface FaceVerificationModalProps {
  isOpen: boolean;
  user: User;
  transaction?: Transaction | null;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: (capturedImage: string) => void;
}

type VerificationStatus = 'PENDING' | 'VERIFYING' | 'SUCCESS' | 'FAILED';

const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({ isOpen, user, transaction, onClose, onSuccess, onFailure }) => {
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
          window.clearInterval(verificationStepIntervalRef.current);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (verificationStepIntervalRef.current) {
          window.clearInterval(verificationStepIntervalRef.current);
      }
    };
  }, [isOpen]);
  
  const captureFrame = (): string | null => {
      if (!videoRef.current || !canvasRef.current) return null;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const MAX_DIMENSION = 512;
      let { videoWidth, videoHeight } = video;

      const aspectRatio = videoWidth / videoHeight;

      let targetWidth, targetHeight;
      if (videoWidth > videoHeight) {
          targetWidth = Math.min(videoWidth, MAX_DIMENSION);
          targetHeight = targetWidth / aspectRatio;
      } else {
          targetHeight = Math.min(videoHeight, MAX_DIMENSION);
          targetWidth = targetHeight * aspectRatio;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d');
      if (!context) return null;

      context.translate(targetWidth, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, targetWidth, targetHeight);
      context.setTransform(1, 0, 0, 1, 0, 0); 
      
      return canvas.toDataURL('image/jpeg', 0.8);
  }

  const handleVerify = async (isImposterSimulation: boolean) => {
    setStatus('VERIFYING');
    
    const verificationSteps = [ "Capturing Biometrics...", "Analyzing Facial Vectors...", "Comparing Signatures...", "Finalizing Result..." ];
    let stepIndex = 0;

    const updateMessage = () => {
        setVerificationMessage(verificationSteps[stepIndex]);
        stepIndex = (stepIndex + 1) % verificationSteps.length;
    };
    updateMessage();
    verificationStepIntervalRef.current = window.setInterval(updateMessage, 1500);
    
    const liveImage = captureFrame();
    
    const canvas = canvasRef.current;
    if (canvas && liveImage) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let darkPixels = 0;
            const pixelCount = data.length / 4;
            const sampleRate = 100;
            for (let i = 0; i < data.length; i += 4 * sampleRate) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (r < 15 && g < 15 && b < 15) {
                    darkPixels++;
                }
            }
            
            const totalSampled = Math.ceil(pixelCount / sampleRate);
            if (darkPixels / totalSampled > 0.95) {
                if (verificationStepIntervalRef.current) window.clearInterval(verificationStepIntervalRef.current);
                const reason = "Verification failed. Camera feed was obscured or unavailable.";
                setFailureReason(reason);
                setStatus('FAILED');
                setTimeout(() => onFailure("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="), 1000); 
                return;
            }
        }
    }

    if (!liveImage) {
        setFailureReason("Could not capture image from camera.");
        setStatus('FAILED');
        setTimeout(() => onFailure(''), 1000);
        return;
    }

    try {
        const result = await geminiService.verifyFaceSimilarity(liveImage, user.faceReferenceImages || [], transaction, user, isImposterSimulation);
        
        if (verificationStepIntervalRef.current) window.clearInterval(verificationStepIntervalRef.current);
        
        if(result.match) {
            setStatus('SUCCESS');
            setTimeout(() => onSuccess(), 250);
        } else {
            setFailureReason(result.reason);
            setStatus('FAILED');
            setTimeout(() => onFailure(liveImage), 1000);
        }
    } catch(e) {
        if (verificationStepIntervalRef.current) window.clearInterval(verificationStepIntervalRef.current);
        console.error("Biometric comparison failed", e);
        setFailureReason(e instanceof Error ? e.message : "A system error occurred during verification.");
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
                                                
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button onClick={() => handleVerify(false)} disabled={!!error || !stream} className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed">
                                <UserCheckIcon className="mr-2 w-5 h-5" />
                                Verify My Face
                            </button>
                             <button onClick={() => handleVerify(true)} disabled={!!error || !stream} className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-600 text-base font-medium rounded-md text-orange-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-gray-900 disabled:bg-gray-800 disabled:cursor-not-allowed">
                                <UserIcon className="mr-2 w-5 h-5" />
                                Simulate Imposter
                            </button>
                        </div>
                    </div>
                </>
            );
    }
  }


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 max-w-sm w-full relative min-h-[420px] flex flex-col justify-center">
        <canvas ref={canvasRef} className="hidden"></canvas>
        {status === 'PENDING' && <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>}
        {renderContent()}
      </div>
    </div>
  );
};

export default FaceVerificationModal;
