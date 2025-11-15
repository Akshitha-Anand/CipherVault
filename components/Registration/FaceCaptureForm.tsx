import React, { useState, useEffect, useRef } from 'react';
import { CameraIcon, RefreshCwIcon, ShieldCheckIcon } from '../icons';

interface FaceCaptureFormProps {
  onSubmit: (faceImage: string) => void;
}

const FaceCaptureForm: React.FC<FaceCaptureFormProps> = ({ onSubmit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
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
        setError("Camera access is required. Please enable it in your browser settings.");
      }
    };
    if (!capturedImage) {
        startCamera();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [capturedImage]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
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
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };
  
  const handleSubmit = () => {
    if(capturedImage) {
        onSubmit(capturedImage);
    }
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 shadow-lg animate-fade-in">
        <canvas ref={canvasRef} className="hidden"></canvas>
        <h2 className="text-2xl font-semibold mb-2 text-cyan-300">Biometric Setup</h2>
        <p className="text-gray-400 mb-6">Step 3: Capture your face for enhanced security.</p>
        
        <div className="w-full aspect-square bg-gray-900 rounded-md flex items-center justify-center overflow-hidden relative">
            {error && <p className="text-red-400 text-center text-sm p-4">{error}</p>}
            
            {!error && capturedImage && (
                <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
            )}

            {!error && !capturedImage && (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
            )}

             {!error && !capturedImage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3/4 h-3/4 border-4 border-dashed border-white/30 rounded-full"></div>
                </div>
            )}
        </div>
        
        <div className="mt-6">
            {capturedImage ? (
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleRetake} className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-base font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600">
                        <RefreshCwIcon className="mr-2 w-5 h-5" /> Retake
                    </button>
                    <button onClick={handleSubmit} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700">
                        <ShieldCheckIcon className="mr-2 w-5 h-5" /> Confirm & Finish
                    </button>
                </div>
            ) : (
                <button onClick={handleCapture} disabled={!!error} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600">
                    <CameraIcon className="mr-2 w-5 h-5" /> Capture Photo
                </button>
            )}
        </div>
    </div>
  );
};

export default FaceCaptureForm;
