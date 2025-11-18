import React, { useState, useEffect, useRef } from 'react';
import { CameraIcon, ShieldCheckIcon, XIcon, ArrowUpTrayIcon, CpuIcon } from '../icons';
import geminiService from '../../services/geminiService';

interface FaceCaptureFormProps {
  onSubmit: (faceImages: string[], detectedGender: 'MALE' | 'FEMALE' | 'OTHER') => void;
  isLoading: boolean;
}

const MAX_IMAGES = 5;
const MIN_IMAGES = 3;

const FaceCaptureForm: React.FC<FaceCaptureFormProps> = ({ onSubmit, isLoading }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [aiDetectedGender, setAiDetectedGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

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
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const classifyGender = async (image: string) => {
    setIsClassifying(true);
    try {
      const result = await geminiService.analyzeRegistrationFace(image);
      setAiDetectedGender(result.gender);
    } catch (e) {
      console.error("Gender classification failed", e);
      // Fallback or show error
    } finally {
      setIsClassifying(false);
    }
  };
  
  const addImageAndClassify = (image: string) => {
    if (capturedImages.length === 0) {
      classifyGender(image);
    }
    setCapturedImages(prev => [...prev, image]);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || capturedImages.length >= MAX_IMAGES) return;
    
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
    addImageAndClassify(image);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        const remainingSlots = MAX_IMAGES - capturedImages.length;
        if (files.length > remainingSlots) {
            alert(`You can only upload ${remainingSlots} more image(s).`);
        }
        
        files.slice(0, remainingSlots).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    addImageAndClassify(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };


  const handleDeleteImage = (index: number) => {
    const isFirstImage = index === 0;
    setCapturedImages(prev => {
        const newImages = prev.filter((_, i) => i !== index);
        if (isFirstImage && newImages.length > 0) {
            classifyGender(newImages[0]); // Re-classify with the new first image
        } else if (newImages.length === 0) {
            setAiDetectedGender(null); // Reset if no images left
        }
        return newImages;
    });
  };

  const handleSubmit = () => {
    if (capturedImages.length >= MIN_IMAGES && aiDetectedGender) {
      onSubmit(capturedImages, aiDetectedGender);
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 shadow-lg animate-fade-in">
      <canvas ref={canvasRef} className="hidden"></canvas>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect}
        className="hidden" 
        multiple 
        accept="image/png, image/jpeg"
      />
      <h2 className="text-2xl font-semibold mb-2 text-cyan-300">Biometric Setup</h2>
      <p className="text-gray-400 mb-6">Capture or upload at least {MIN_IMAGES} clear photos of your face for AI analysis.</p>
      
      <div className="w-full aspect-square bg-gray-900 rounded-md flex items-center justify-center overflow-hidden relative">
        {error ? (
          <p className="text-red-400 text-center text-sm p-4">{error}</p>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-3/4 border-4 border-dashed border-white/30 rounded-full"></div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <button 
          onClick={handleCapture} 
          disabled={!!error || !stream || isLoading || isClassifying || capturedImages.length >= MAX_IMAGES} 
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <CameraIcon className="mr-2 w-5 h-5" /> 
          Capture
        </button>
        <button 
          type="button"
          onClick={triggerFileUpload}
          disabled={isLoading || isClassifying || capturedImages.length >= MAX_IMAGES}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-base font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed"
        >
          <ArrowUpTrayIcon className="mr-2 w-5 h-5" />
          Upload
        </button>
      </div>
       <p className="text-center text-gray-400 text-xs mt-2">
            {capturedImages.length} of {MAX_IMAGES} images added.
        </p>

      {isClassifying && (
        <div className="text-center text-cyan-300 text-sm mt-2 flex items-center justify-center gap-2 animate-pulse">
            <CpuIcon className="w-4 h-4" /> Analyzing first image...
        </div>
      )}
      {aiDetectedGender && !isClassifying && (
        <div className="text-center text-green-300 text-sm mt-2">
            AI Detected Gender: <span className="font-bold">{aiDetectedGender}</span>
        </div>
      )}

      {capturedImages.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Your Captures:</h3>
          <div className="grid grid-cols-5 gap-2">
            {capturedImages.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img} alt={`Capture ${i+1}`} className="w-full h-full object-cover rounded-md aspect-square" />
                <button 
                  onClick={() => handleDeleteImage(i)}
                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Delete capture ${i+1}`}
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <button 
          onClick={handleSubmit} 
          disabled={isLoading || isClassifying || capturedImages.length < MIN_IMAGES || !aiDetectedGender} 
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShieldCheckIcon className="mr-2 w-5 h-5" /> 
          {isLoading ? 'Creating Account...' : `Confirm & Finish (${capturedImages.length})`}
        </button>
        {capturedImages.length < MIN_IMAGES && (
            <p className="text-center text-yellow-400 text-xs mt-2">
                Please add at least {MIN_IMAGES - capturedImages.length} more photo(s).
            </p>
        )}
      </div>
    </div>
  );
};

export default FaceCaptureForm;
