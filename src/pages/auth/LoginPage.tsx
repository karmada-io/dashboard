import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the redirect path from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      toast.error('Please enter a valid token');
      return;
    }

    setIsLoading(true);
    
    try {
      await login(token);
      toast.success('Login successful!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Mobile logo */}
      <div className="flex justify-center mb-8 lg:hidden">
        <svg
          className="h-12 w-12 text-primary-600"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-secondary-900 dark:text-white">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-secondary-600 dark:text-secondary-400">
          Sign in to your Karmada Dashboard account
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
            Authentication Token
          </label>
          <div className="mt-1 relative">
            <input
              id="token"
              name="token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 pr-10 border border-secondary-300 dark:border-secondary-600 placeholder-secondary-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-white bg-white dark:bg-secondary-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors duration-200"
              placeholder="Enter your authentication token"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300" />
              ) : (
                <Eye className="h-4 w-4 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-secondary-500 dark:text-secondary-400">
            Enter your Kubernetes service account token or cluster admin token
          </p>
        </div>

        <div>
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            disabled={!token.trim()}
          >
            Sign in
          </Button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-secondary-300 dark:border-secondary-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-secondary-900 text-secondary-500 dark:text-secondary-400">
                Need help?
              </span>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              Contact your cluster administrator to get an authentication token
            </p>
          </div>
        </div>
      </form>

      {/* Development note */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-warning-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
                Development Mode
              </h3>
              <div className="mt-2 text-sm text-warning-700 dark:text-warning-300">
                <p>
                  For development, you can use any non-empty token value. 
                  The backend authentication will be bypassed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;