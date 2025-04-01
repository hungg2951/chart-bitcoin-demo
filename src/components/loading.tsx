export default function LoadingSpinner() {
    return (
      <div className="absolute inset-0 flex justify-center items-center bg-opacity-50">
        <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }