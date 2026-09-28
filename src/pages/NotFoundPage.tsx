import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';
import { Button } from '@/components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-16 sm:py-24 px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
        <AlertCircle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Page Not Found</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The room or route you are trying to access does not exist or has expired.
        </p>
      </div>

      <Link to="/" className="inline-block">
        <Button variant="primary" icon={<Home className="w-4 h-4" />}>
          Return to Home
        </Button>
      </Link>
    </div>
  );
};
