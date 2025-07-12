import logoSvg from '@/assets/logo.svg';

export default function LogoViewer() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">CO Buddy AI Logo</h1>
        <img src={logoSvg} alt="CO Buddy AI Logo" className="w-64 h-64" />
        <p className="text-sm text-gray-600 mt-4 text-center">
          Right-click and save image for Azure upload
        </p>
      </div>
    </div>
  );
}