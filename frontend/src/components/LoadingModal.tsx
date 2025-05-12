import { useEffect, useState, useRef } from 'react';
import './LoadingModal.css';

interface LoadingModalProps {
  message?: string | null;
}

export default function LoadingModal({ message }: LoadingModalProps) {
  const [isExtendedLoading, setIsExtendedLoading] = useState(false);
  const loadingTimerRef = useRef<number | null>(null);
  
  // Add/remove body scroll lock when modal is shown
  useEffect(() => {
    if (message) {
      document.body.classList.add('overflow-hidden');
      
      // Set extended loading state after 15 seconds
      loadingTimerRef.current = window.setTimeout(() => {
        setIsExtendedLoading(true);
      }, 15000);
    } else {
      document.body.classList.remove('overflow-hidden');
      setIsExtendedLoading(false);
      
      // Clear timeout if loading is finished
      if (loadingTimerRef.current !== null) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
    
    return () => {
      document.body.classList.remove('overflow-hidden');
      
      // Clear timeout on unmount
      if (loadingTimerRef.current !== null) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [message]);

  if (!message) return null;
  
  return (
    <div className={`loading-modal ${isExtendedLoading ? 'extended-loading' : ''}`}>
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-message">{message}</p>
        {isExtendedLoading && (
          <p className="loading-extended-message">
            This is taking longer than expected...
          </p>
        )}
        <div className="text-xs text-slate-500 mt-4 max-w-xs text-center">
          Creating detailed 3D models can be resource-intensive. Larger files may take more time to process.
        </div>
      </div>
    </div>
  );
} 