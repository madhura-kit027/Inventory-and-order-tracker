import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signInWithEmail, signUp, resetPassword, authError, clearAuthError } = useAuth();

  // Update mode when initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialMode === 'signup');
      setIsForgotPassword(false);
      setResetSent(false);
      setIsSuccess(false);
      clearAuthError();
    }
  }, [isOpen, initialMode, clearAuthError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const trimmedEmail = email.trim();
    try {
      if (isForgotPassword) {
        await resetPassword(trimmedEmail);
        setResetSent(true);
      } else if (isSignUp) {
        await signUp(trimmedEmail, password, displayName);
        setIsSuccess(true);
        // Don't close immediately so user can see success message
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        await signInWithEmail(trimmedEmail, password);
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-brand-100 flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-brand-900">
              {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Welcome Back')}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-brand-100 rounded-full transition-colors text-brand-400 hover:text-brand-900"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-8">
            <div className="flex items-center justify-center gap-2 mb-8 px-4 py-2 bg-brand-50 rounded-full w-fit mx-auto">
              <ShieldCheck size={14} className="text-brand-900" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-900">Secure 256-bit Encrypted Login</span>
            </div>

            {/* Auth Error */}
            {authError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-3 text-red-700 text-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <p className="font-bold">{authError.includes('CONNECTION BLOCKED') ? 'Network Block Detected' : 'Issue Detected'}</p>
                    <p>{authError}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 ml-7 text-[11px] font-bold uppercase tracking-widest">
                  {!isSignUp && !isForgotPassword ? (
                    <>
                      {authError.includes('Domain unauthorized') || authError.includes('not enabled') ? (
                        <p className="text-red-900 font-bold bg-white px-2 py-1 rounded border border-red-200">Please fix Console settings above to proceed</p>
                      ) : authError.includes('CONNECTION BLOCKED') ? (
                        <div className="space-y-2">
                          <p className="text-red-900/60 font-medium">Try disabling extensions or use a different network</p>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsSignUp(true);
                              clearAuthError();
                            }}
                            className="underline hover:text-red-900 block"
                          >
                            Try Email Signup instead
                          </button>
                        </div>
                      ) : (authError.includes('using a password') || authError.includes('Incorrect email or password')) ? (
                        <>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsForgotPassword(true);
                              clearAuthError();
                            }}
                            className="underline hover:text-red-900"
                          >
                            Reset Password Now
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsSignUp(true);
                              clearAuthError();
                            }}
                            className="underline hover:text-red-900"
                          >
                            Create Account
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsSignUp(true);
                              clearAuthError();
                            }}
                            className="underline hover:text-red-900"
                          >
                            Create Account
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsForgotPassword(true);
                              clearAuthError();
                            }}
                            className="underline hover:text-red-900"
                          >
                            Reset Password
                          </button>
                        </>
                      )}
                    </>
                  ) : isForgotPassword ? (
                    (authError.includes('No account found') || authError.includes('using a password')) && (
                      <button 
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(false);
                          setIsSignUp(true);
                          clearAuthError();
                        }}
                        className="underline hover:text-red-900"
                      >
                        Create Account Instead
                      </button>
                    )
                  ) : (
                    isSignUp && authError.includes('already in use') && (
                      <button 
                        type="button"
                        onClick={() => {
                          setIsSignUp(false);
                          clearAuthError();
                        }}
                        className="underline hover:text-red-900"
                      >
                        Sign In
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck size={40} />
                </div>
                <h3 className="text-2xl font-display font-bold text-brand-900 mb-2">
                  {isSignUp ? 'Account Created Successfully!' : 'Signed In Successfully!'}
                </h3>
                <p className="text-brand-500">
                  {isSignUp ? 'Welcome to ZENVY. Redirecting you to the store...' : 'Welcome back! Redirecting you to the store...'}
                </p>
              </motion.div>
            ) : resetSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                  <Mail size={32} />
                </div>
                <h3 className="text-xl font-display font-bold text-brand-900 mb-2">Check your email</h3>
                <p className="text-brand-500 mb-4">
                  We've sent a password reset link to <span className="font-bold text-brand-900">{email}</span>.
                </p>
                <p className="text-xs text-brand-400 mb-8 italic">
                  Don't see it? Check your <span className="font-bold">Spam</span> or <span className="font-bold">Promotions</span> folder.
                </p>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        await resetPassword(email);
                      } catch (e) {}
                      setIsLoading(false);
                    }}
                    disabled={isLoading}
                    className="px-8 py-3 bg-brand-900 text-white rounded-full font-bold text-sm uppercase tracking-widest hover:bg-brand-800 transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Sending...' : 'Resend Link'}
                  </button>
                  <button
                    onClick={() => {
                      setResetSent(false);
                      clearAuthError();
                    }}
                    className="text-brand-400 hover:text-brand-900 text-xs font-bold uppercase tracking-widest"
                  >
                    Change Email
                  </button>
                  <button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSent(false);
                      clearAuthError();
                    }}
                    className="text-brand-900 font-bold hover:underline text-sm"
                  >
                    Back to Sign In
                  </button>
                </div>
              </motion.div>
            ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-5">
                  {isSignUp && !isForgotPassword && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-500 uppercase tracking-wider ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-brand-50 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-brand-900 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-500 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-brand-50 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-brand-900 transition-all"
                      />
                    </div>
                  </div>

                  {!isForgotPassword && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-bold text-brand-500 uppercase tracking-wider">Password</label>
                        {!isSignUp && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotPassword(true);
                              clearAuthError();
                            }}
                            className="text-[10px] font-bold text-brand-400 hover:text-brand-900 uppercase tracking-wider"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-brand-50 border-none rounded-2xl py-3 pl-12 pr-12 focus:ring-2 focus:ring-brand-900 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-brand-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-900/20"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {isForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Sign In')}
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-brand-500">
                  {isForgotPassword ? (
                    <button
                      onClick={() => {
                        setIsForgotPassword(false);
                        clearAuthError();
                      }}
                      className="text-brand-900 font-bold hover:underline"
                    >
                      Back to Sign In
                    </button>
                  ) : (
                    <>
                      {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                      <button
                        onClick={() => {
                          setIsSignUp(!isSignUp);
                          clearAuthError();
                        }}
                        className="text-brand-900 font-bold hover:underline"
                      >
                        {isSignUp ? 'Sign In' : 'Create Account'}
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
