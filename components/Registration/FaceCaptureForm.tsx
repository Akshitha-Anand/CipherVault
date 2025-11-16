import React, { useState, useEffect, useRef } from 'react';
import { CameraIcon, RefreshCwIcon, ShieldCheckIcon } from '../icons';

interface FaceCaptureFormProps {
  onSubmit: (faceImages: string[]) => void;
}

const FaceCaptureForm: React.FC<FaceCaptureFormProps> = ({ onSubmit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [step, setStep] = useState(0); // 0, 1, 2 for captures
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  
  const instructions = [
      "Look straight ahead into the camera.",
      "Now, turn your head slightly to the left.",
      "Finally, turn your head slightly to the right."
  ];

  const startCamera = async () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
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

  useEffect(() => {
    if (capturedImages.length < 3) {
        startCamera();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [capturedImages.length]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
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
    const image = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImages(prev => [...prev, image]);
    setStep(prev => prev + 1);

    if (step === 2) {
         if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }
  };

  const handleRetake = () => {
    setCapturedImages([]);
    setStep(0);
  };
  
  const handleSubmit = () => {
    if(capturedImages.length === 3) {
        onSubmit(capturedImages);
    }
  }

  const isReviewing = capturedImages.length === 3;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 shadow-lg animate-fade-in">
        <canvas ref={canvasRef} className="hidden"></canvas>
        <h2 className="text-2xl font-semibold mb-2 text-cyan-300">Biometric Setup</h2>
        <p className="text-gray-400 mb-6">{isReviewing ? 'Step 3: Review your captures.' : `Step 3: Capture your face (${step + 1}/3).`}</p>
        
        <div className="w-full aspect-square bg-gray-900 rounded-md flex items-center justify-center overflow-hidden relative">
            {error && <p className="text-red-400 text-center text-sm p-4">{error}</p>}
            
            {isReviewing ? (
                 <div className="grid grid-cols-3 gap-2 p-2 h-full w-full">
                    {capturedImages.map((img, i) => (
                        <img key={i} src={img} alt={`Capture ${i+1}`} className="w-full h-full object-cover rounded-md" />
                    ))}
                 </div>
            ) : (
                <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-3/4 h-3/4 border-4 border-dashed border-white/30 rounded-full"></div>
                    </div>
                </>
            )}
        </div>
        
        <p className="text-center text-cyan-300 font-semibold my-4 h-5">
            {!isReviewing && instructions[step]}
        </p>

        <div className="mt-2">
            {isReviewing ? (
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleRetake} className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-base font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600">
                        <RefreshCwIcon className="mr-2 w-5 h-5" /> Retake All
                    </button>
                    <button onClick={handleSubmit} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700">
                        <ShieldCheckIcon className="mr-2 w-5 h-5" /> Confirm & Finish
                    </button>
                </div>
            ) : (
                <button onClick={handleCapture} disabled={!!error || !stream} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600">
                    <CameraIcon className="mr-2 w-5 h-5" /> Capture Photo ({step + 1}/3)
                </button>
            )}
        </div>
    </div>
  );
};

export default FaceCaptureForm;