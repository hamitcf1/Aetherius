import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sendPasswordReset, verifyPasswordResetCode, confirmPasswordReset } from '../../services/firebase';
import { Lock, Mail, CheckCircle, XCircle } from 'lucide-react';

const PasswordResetRequest = ({ onEmailSent }: { onEmailSent: (email: string) => void }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setStatus('sending');
    try {
      const result = await sendPasswordReset(email);
      if (result.success) {
        setStatus('sent');
        onEmailSent(email);
      } else {
        setStatus('error');
        setError(result.error || 'Failed to send password reset email');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setStatus('error');
      setError('An unexpected error occurred');
    }
  };

  if (status === 'sent') {
    return (
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
        <p className="text-gray-600 mb-6">
          We've sent a password reset link to <span className="font-medium">{email}</span>.
        </p>
        <p className="text-sm text-gray-500">
          Didn't receive the email?{' '}
          <button 
            onClick={() => setStatus('idle')}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Click to resend
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Lock className="h-12 w-12 text-blue-500 mx-auto" />
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Reset your password</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {status === 'error' && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-start">
          <XCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'sending' ? 'Sending...' : 'Send reset link'}
          </button>
        </div>
      </form>
    </div>
  );
};

const PasswordResetForm = ({ email, onReset }: { email: string; onReset: () => void }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'resetting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    const oobCode = searchParams.get('oobCode');
    if (!oobCode) {
      setError('Invalid reset link');
      return;
    }

    setStatus('resetting');
    try {
      const result = await confirmPasswordReset(oobCode, password);
      if (result.success) {
        setStatus('success');
        setTimeout(() => {
          onReset();
        }, 3000);
      } else {
        setStatus('error');
        setError(result.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setStatus('error');
      setError('An unexpected error occurred');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Password updated</h3>
        <p className="text-gray-600 mb-6">
          Your password has been successfully updated. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Lock className="h-12 w-12 text-blue-500 mx-auto" />
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Create new password</h2>
        <p className="mt-2 text-sm text-gray-600">
          Please enter a new password for <span className="font-medium">{email}</span>.
        </p>
      </div>

      {status === 'error' && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-start">
          <XCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New password
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
            Confirm new password
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={status === 'resetting'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'resetting' ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const PasswordReset = () => {
  const [email, setEmail] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  // If we have an oobCode, we're in the password reset flow
  if (mode === 'resetPassword' && oobCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <PasswordResetForm 
            email={email || 'your account'} 
            onReset={() => {
              // Redirect to login after a short delay
              window.location.href = '/login';
            }} 
          />
        </div>
      </div>
    );
  }

  // Otherwise, show the password reset request form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <PasswordResetRequest onEmailSent={(email) => setEmail(email)} />
      </div>
    </div>
  );
};

export default PasswordReset;
