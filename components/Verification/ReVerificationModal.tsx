import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlertIcon, CheckCircle2, ShieldXIcon, CameraIcon, UserCheckIcon, ProcessingSpinner } from '../icons';
import { User } from '../../types';
import geminiService from '../../services/geminiService';

interface ReVerificationModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSuccess: (reason: string) => void;
  onFailure: (reason: string) => void;
}

type VerificationStatus = 'PENDING' | 'VERIFYING' | 'SUCCESS' | 'FAILED';

const ReVerificationModal: React.FC<ReVerificationModalProps> = ({ isOpen, user, onClose, onSuccess, onFailure }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationStatus>('PENDING');
  const [failureReason, setFailureReason] = useState<string>('');
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  const verificationStepIntervalRef = useRef<number | null>(null);
  const [simulateSuccess, setSimulateSuccess] = useState(true);
  const [simulatedGender, setSimulatedGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>(user.gender);

  useEffect(() => {
    if (isOpen) {
      setStatus('PENDING');
      setError(null);
      setFailureReason('');
      setVerificationMessage('');
      setSimulateSuccess(true);
      setSimulatedGender(user.gender);


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
  }, [isOpen, user.gender]);
  
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

  const handleVerify = async () => {
    setStatus('VERIFYING');

    const verificationSteps = [ "Capturing Biometrics...", "Analyzing Facial Vectors...", "Finalizing Result..." ];
    let stepIndex = 0;

    const updateMessage = () => {
        setVerificationMessage(verificationSteps[stepIndex]);
        stepIndex = (stepIndex + 1) % verificationSteps.length;
    };
    updateMessage();
    verificationStepIntervalRef.current = window.setInterval(updateMessage, 1500);
    
    const liveImage = captureFrame();

    // --- CAMERA BLACKOUT DETECTION ---
    const canvas = canvasRef.current;
    if (canvas && liveImage) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let darkPixels = 0;
            const pixelCount = data.length / 4;
            const sampleRate = 100; // Sample 1% of pixels
            for (let i = 0; i < data.length; i += 4 * sampleRate) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (r < 15 && g < 15 && b < 15) {
                    darkPixels++;
                }
            }
            
            const totalSampled = Math.ceil(pixelCount / sampleRate);
            if (darkPixels / totalSampled > 0.95) { // If > 95% of sampled pixels are dark
                if (verificationStepIntervalRef.current) window.clearInterval(verificationStepIntervalRef.current);
                const reason = "Verification failed. Camera feed was obscured or unavailable.";
                setFailureReason(reason);
                setStatus('FAILED');
                setTimeout(() => onFailure(reason), 1000); 
                return;
            }
        }
    }
    // --- END BLACKOUT DETECTION ---
    
    if (!liveImage) {
        const reason = "Could not capture image from camera.";
        setFailureReason(reason);
        setStatus('FAILED');
        setTimeout(() => onFailure(reason), 1000);
        return;
    }
    
    try {
        const result = await geminiService.verifyFaceSimilarity(liveImage, user.faceReferenceImages || [], null, user, simulateSuccess, simulatedGender);
        
        if (verificationStepIntervalRef.current) window.clearInterval(verificationStepIntervalRef.current);
        
        if(result.match) {
            setStatus('SUCCESS');
            setTimeout(() => onSuccess(result.reason), 250);
        } else {
            setFailureReason(result.reason);
            setStatus('FAILED');
            setTimeout(() => onFailure(result.reason), 1000);
        }
    } catch(e) {
        if (verificationStepIntervalRef.current) window.clearInterval(verificationStepIntervalRef.current);
        console.error("Biometric comparison failed", e);
        const reason = e instanceof Error ? e.message : "A system error occurred during verification.";
        setFailureReason(reason);
        setStatus('FAILED');
        setTimeout(() => onFailure(reason), 1000);
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
                        <UserCheckIcon className="mx-auto w-12 h-12 text-cyan-400 mb-4" />
                        <h2 className="text-2xl font-bold text-cyan-400">Identity Re-verification</h2>
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

                         <div className="mt-4 grid grid-cols-2 gap-4 items-center">
                            <div className="flex flex-col items-center">
                                <label htmlFor="reverifySimulateToggle" className="text-sm text-gray-400 cursor-pointer mb-1">I am the legitimate user</label>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="reverifySimulateToggle" className="sr-only peer" checked={simulateSuccess} onChange={() => setSimulateSuccess(!simulateSuccess)} />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="reverifySimGender" className="block text-sm text-gray-400 mb-1 text-center">Simulating as:</label>
                                <select
                                  id="reverifySimGender" value={simulatedGender} onChange={(e) => setSimulatedGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                                  className="block w-full bg-gray-700/50 border border-gray-600 rounded-md shadow-sm py-1 px-2 text-sm text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                                >
                                  <option value="MALE">Male</option>
                                  <option value="FEMALE">Female</option>
                                  <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>
                        
                        <button onClick={handleVerify} disabled={!!error || !stream} className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed">
                            <CameraIcon className="mr-2 w-5 h-5" />
                            Start Re-verification
                        </button>
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

export default ReVerificationModal;
