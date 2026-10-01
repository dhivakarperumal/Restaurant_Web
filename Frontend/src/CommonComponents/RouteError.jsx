import { useRouteError } from 'react-router-dom';

const RouteError = () => {
  const error = useRouteError();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111317] px-6 text-gray-200">
      <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-[#181a1f] p-8 text-center shadow-xl">
        <p className="text-sm uppercase tracking-[0.25em] text-red-400">Error</p>
        <h1 className="mt-4 text-3xl font-bold text-white">Something went wrong</h1>
        <p className="mt-3 text-sm text-gray-400">
          {error?.statusText || error?.message || 'The page could not be loaded.'}
        </p>
      </div>
    </div>
  );
};

export default RouteError;
