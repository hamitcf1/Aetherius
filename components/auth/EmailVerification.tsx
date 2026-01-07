import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../../services/firebase';
import { CheckCircle, XCircle } from 'lucide-react';

export const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmailToken = async () => {
      const oobCode = searchParams.get('oobCode');
      if (!oobCode) {
        setStatus('error');
        setError('No verification code provided');
        return;
      }

      try {
        const result = await verifyEmail(oobCode);
        if (result.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setError(result.error || 'Failed to verify email');
        }
      } catch (err) {
        console.error('Email verification error:', err);
        setStatus('error');
        setError('An unexpected error occurred');
      }
    };

    verifyEmailToken();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h2>
        </div>
        
        <div className="mt-8 space-y-6 text-center">
          {status === 'verifying' && (
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-gray-600">Your email has been successfully verified.</p>
              <a 
                href="/login" 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Login
              </a>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <p className="text-gray-600">{error || 'Failed to verify your email. The link may have expired or is invalid.'}</p>
              <button
                onClick={() => window.location.href = '/resend-verification'}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Resend Verification Email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
