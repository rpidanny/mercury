interface LoadingModalProps {
  message?: string | null;
}

export default function LoadingModal({ message }: LoadingModalProps) {
  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 bg-white bg-opacity-10 transition-opacity duration-300 ease-in-out ${
        message ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div id="loading-indicator" />
      {message && <p className="mt-4 text-gray-800 text-lg font-medium">{message}</p>}
    </div>
  );
} 