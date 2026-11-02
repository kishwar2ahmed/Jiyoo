import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  X,
  Lock,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  Settings,
  BarChart,
  Tag,
  Star,
  Truck,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Images,
  Mail,
  KeyRound,
  Smartphone,
  Copy,
  Check,
  Download,
  RefreshCw,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { useCart } from '../../../contexts/CartContext';
import { useModalBackButton } from '../../core/hooks/useModalBackButton';
import { auth, googleProvider } from '../../../services/firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import {
  isOwnerAdminEmail,
  getStoredAdminSignedToken,
  initiateAdminPrimaryAuth,
  verifyAdmin2FAEnrollment,
  verifyAdmin2FAChallenge,
  fetchAdminSecurityStatus,
  regenerateAdminRecoveryCodes,
  logoutAdminSession,
  Admin2FAEnrollmentPayload,
  AdminSecurityStatus,
} from '../../../utils/adminAuth';

import { DashboardTab } from './DashboardTab';
import { ProductsTab } from './ProductsTab';
import { OrdersTab } from './OrdersTab';
import { PaymentsTab } from './PaymentsTab';
import { UsersTab } from './UsersTab';
import { CategoriesTab } from './CategoriesTab';
import { SettingsTab } from './SettingsTab';

const BannersTab = lazy(() => import('./BannersTab').then(m => ({ default: m.BannersTab })));
const AnalyticsTab = lazy(() => import('./AnalyticsTab').then(m => ({ default: m.AnalyticsTab })));
const PromotionsTab = lazy(() => import('./PromotionsTab').then(m => ({ default: m.PromotionsTab })));
const ReviewsTab = lazy(() => import('./ReviewsTab').then(m => ({ default: m.ReviewsTab })));
const ShippingTab = lazy(() => import('./ShippingTab').then(m => ({ default: m.ShippingTab })));
const DeliveryManagementTab = lazy(() => import('./DeliveryManagementTab').then(m => ({ default: m.DeliveryManagementTab })));
const MarketingTab = lazy(() => import('./MarketingTab').then(m => ({ default: m.MarketingTab })));
const AuditLogTab = lazy(() => import('./AuditLogTab').then(m => ({ default: m.AuditLogTab })));

type Tab = 'dashboard' | 'banners' | 'products' | 'orders' | 'payments' | 'users' | 'categories' | 'analytics' | 'promotions' | 'reviews' | 'messages' | 'shipping' | 'delivery' | 'marketing' | 'audit' | 'settings';
type AuthStep = 'CHECKING' | 'PRIMARY_LOGIN' | 'ENROLL_2FA' | 'RECOVERY_CODES' | 'VERIFY_2FA' | 'AUTHENTICATED';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  useModalBackButton(true, onClose);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { user, isAuthLoading } = useCart();

  // Multi-factor strong authentication state machine
  const [authStep, setAuthStep] = useState<AuthStep>('CHECKING');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [loginMethod, setLoginMethod] = useState<'passcode' | 'google' | 'email'>('passcode');
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // 2FA pre-auth & challenge state
  const [preAuthToken, setPreAuthToken] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [enrollmentData, setEnrollmentData] = useState<Admin2FAEnrollmentPayload | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [useRecoveryMode, setUseRecoveryMode] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [issuedRecoveryCodes, setIssuedRecoveryCodes] = useState<string[]>([]);
  const [remainingRecoveryCount, setRemainingRecoveryCount] = useState<number>(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // In-panel Security & 2FA Management modal state
  const [securityStatus, setSecurityStatus] = useState<AdminSecurityStatus | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [regenTotpCode, setRegenTotpCode] = useState('');
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);

  // Countdown timer for brute-force lockout feedback
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handlePrimaryAuthResult = (res: Awaited<ReturnType<typeof initiateAdminPrimaryAuth>>) => {
    if (!res.success) {
      setAuthError(res.error || 'Primary administrator authentication failed.');
      if (typeof res.remainingAttempts === 'number') setRemainingAttempts(res.remainingAttempts);
      if (typeof res.retryAfterSeconds === 'number') setLockoutSeconds(res.retryAfterSeconds);
      setAuthStep('PRIMARY_LOGIN');
      return;
    }

    setAuthError('');
    setRemainingAttempts(null);
    if (res.email) setVerifiedEmail(res.email);
    if (typeof res.remainingRecoveryCodes === 'number') {
      setRemainingRecoveryCount(res.remainingRecoveryCodes);
    }

    if (res.requires2FA && res.preAuthToken) {
      setPreAuthToken(res.preAuthToken);
      setTotpCode('');
      setRecoveryCodeInput('');
      setUseRecoveryMode(false);
      if (res.totpEnrolled === false && res.enrollment) {
        setEnrollmentData(res.enrollment);
        setAuthStep('ENROLL_2FA');
      } else {
        setAuthStep('VERIFY_2FA');
      }
      return;
    }

    if (res.mfaVerified && res.token) {
      fetchAdminSecurityStatus().then((st) => {
        if (st) setSecurityStatus(st);
      });
      setAuthStep('AUTHENTICATED');
    } else {
      setAuthStep('PRIMARY_LOGIN');
    }
  };

  // Verify existing server-signed 2FA session on mount or initiate 2FA if Firebase admin is signed in
  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    const verifyExistingSession = async () => {
      const existingToken = getStoredAdminSignedToken();
      if (existingToken) {
        const status = await fetchAdminSecurityStatus();
        if (!cancelled && status && status.mfaVerified) {
          setSecurityStatus(status);
          setVerifiedEmail(status.email);
          setRemainingRecoveryCount(status.remainingRecoveryCodes);
          setAuthStep('AUTHENTICATED');
          return;
        }
      }

      // If user is already signed in with an authorized Firebase Admin account, trigger primary auth -> 2FA step
      if (user?.admin === true || user?.role === 'admin' || isOwnerAdminEmail(user?.email)) {
        const primaryRes = await initiateAdminPrimaryAuth();
        if (cancelled) return;
        handlePrimaryAuthResult(primaryRes);
      } else {
        if (!cancelled) {
          setAuthStep('PRIMARY_LOGIN');
        }
      }
    };

    verifyExistingSession();
    return () => {
      cancelled = true;
    };
  }, [user, isAuthLoading]);

  const handleGoogleAdminLogin = async () => {
    setAuthError('');
    setIsSigningIn(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const email = cred.user?.email || '';
      const idTokenResult = await cred.user.getIdTokenResult(true);
      if (idTokenResult.claims.admin === true || isOwnerAdminEmail(email)) {
        const primaryRes = await initiateAdminPrimaryAuth();
        handlePrimaryAuthResult(primaryRes);
      } else {
        setAuthError(`Account (${email}) is not registered as a JIYOO Store Administrator.`);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Google administrator sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!adminEmail.trim() || !adminPassword) {
      setAuthError('Please enter both your administrator email and password.');
      return;
    }
    setIsSigningIn(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
      const email = cred.user?.email || '';
      const idTokenResult = await cred.user.getIdTokenResult(true);
      if (idTokenResult.claims.admin === true || isOwnerAdminEmail(email)) {
        const primaryRes = await initiateAdminPrimaryAuth();
        handlePrimaryAuthResult(primaryRes);
      } else {
        setAuthError(`Account (${email}) does not have administrator privileges.`);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Invalid administrator email or password.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!ownerPinInput.trim()) {
      setAuthError('Please enter the owner master passcode.');
      return;
    }
    setIsSigningIn(true);
    try {
      const primaryRes = await initiateAdminPrimaryAuth({ ownerPin: ownerPinInput.trim() });
      handlePrimaryAuthResult(primaryRes);
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleVerify2FAEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const cleanCode = totpCode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      setAuthError('Please enter the 6-digit code from your authenticator app.');
      return;
    }
    setIsSigningIn(true);
    try {
      const res = await verifyAdmin2FAEnrollment(preAuthToken, cleanCode);
      if (!res.success) {
        setAuthError(res.error || 'Invalid 6-digit authenticator code.');
        if (typeof res.remainingAttempts === 'number') setRemainingAttempts(res.remainingAttempts);
        if (typeof res.retryAfterSeconds === 'number') setLockoutSeconds(res.retryAfterSeconds);
        return;
      }
      const status = await fetchAdminSecurityStatus();
      if (status) setSecurityStatus(status);
      if (Array.isArray(res.recoveryCodes) && res.recoveryCodes.length > 0) {
        setIssuedRecoveryCodes(res.recoveryCodes);
        setAuthStep('RECOVERY_CODES');
      } else {
        setAuthStep('AUTHENTICATED');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleVerify2FAChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const codeToVerify = useRecoveryMode
      ? recoveryCodeInput.trim().toUpperCase()
      : totpCode.replace(/\s+/g, '');

    if (!useRecoveryMode && !/^\d{6}$/.test(codeToVerify)) {
      setAuthError('Please enter the 6-digit TOTP code from your authenticator app.');
      return;
    }
    if (useRecoveryMode && codeToVerify.length < 8) {
      setAuthError('Please enter a valid 2FA Backup Recovery Code (e.g. XXXX-XXXX).');
      return;
    }

    setIsSigningIn(true);
    try {
      const res = await verifyAdmin2FAChallenge(preAuthToken, codeToVerify, useRecoveryMode);
      if (!res.success) {
        setAuthError(res.error || 'Two-factor verification failed.');
        if (typeof res.remainingAttempts === 'number') setRemainingAttempts(res.remainingAttempts);
        if (typeof res.retryAfterSeconds === 'number') setLockoutSeconds(res.retryAfterSeconds);
        return;
      }
      const status = await fetchAdminSecurityStatus();
      if (status) setSecurityStatus(status);
      setAuthStep('AUTHENTICATED');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCopyText = (text: string, type: 'secret' | 'recovery') => {
    navigator.clipboard?.writeText(text).catch(() => {});
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2000);
    }
  };

  const handleDownloadRecoveryCodes = (codes: string[]) => {
    const content = [
      'JIYOO ADMIN PORTAL - 2FA BACKUP RECOVERY CODES',
      `Account: ${verifiedEmail || user?.email || 'Admin'}`,
      `Generated: ${new Date().toISOString()}`,
      '--------------------------------------------------',
      'IMPORTANT: Keep these codes in a secure password manager.',
      'Each code can only be used once if you lose access to your authenticator app.',
      '',
      ...codes.map((c, idx) => `${idx + 1}. ${c}`),
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jiyoo-admin-2fa-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerateRecoveryCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegenError('');
    setRegeneratedCodes(null);
    const clean = regenTotpCode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(clean)) {
      setRegenError('Enter your current 6-digit Authenticator TOTP code to confirm.');
      return;
    }
    setIsRegeneratingCodes(true);
    try {
      const res = await regenerateAdminRecoveryCodes(clean);
      if (!res.success || !res.recoveryCodes) {
        setRegenError(res.error || 'Failed to regenerate backup recovery codes.');
        return;
      }
      setRegeneratedCodes(res.recoveryCodes);
      setRegenTotpCode('');
      const updatedStatus = await fetchAdminSecurityStatus();
      if (updatedStatus) setSecurityStatus(updatedStatus);
    } finally {
      setIsRegeneratingCodes(false);
    }
  };

  const handleAdminSignOut = async () => {
    await logoutAdminSession();
    setSecurityStatus(null);
    setPreAuthToken('');
    setTotpCode('');
    setRecoveryCodeInput('');
    setShowSecurityModal(false);
    setAuthStep('PRIMARY_LOGIN');
  };

  if (isAuthLoading || authStep === 'CHECKING') {
    return (
      <div className="fixed inset-0 z-[100] bg-brand-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  if (authStep !== 'AUTHENTICATED') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#FAF9F5] flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-xl p-6 sm:p-8 my-auto">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              {authStep === 'PRIMARY_LOGIN' ? (
                <Lock className="w-7 h-7 text-emerald-800" />
              ) : (
                <Smartphone className="w-7 h-7 text-emerald-800" />
              )}
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-700 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              {authStep === 'PRIMARY_LOGIN' && 'Step 1 of 2 • Primary Identity'}
              {authStep === 'ENROLL_2FA' && 'Step 2 of 2 • Mandatory 2FA Setup'}
              {authStep === 'VERIFY_2FA' && 'Step 2 of 2 • Two-Factor Verification'}
              {authStep === 'RECOVERY_CODES' && '2FA Activated • Backup Recovery Codes'}
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-900">
              {authStep === 'PRIMARY_LOGIN' && 'JIYOO Admin Authentication'}
              {authStep === 'ENROLL_2FA' && 'Set Up Authenticator 2FA'}
              {authStep === 'VERIFY_2FA' && 'Two-Factor Security Challenge'}
              {authStep === 'RECOVERY_CODES' && 'Save Your Recovery Codes'}
            </h2>
            <p className="text-stone-500 mt-1 text-xs leading-relaxed">
              {authStep === 'PRIMARY_LOGIN' &&
                'Protected by strict rate limiting, progressive brute-force lockout, and mandatory RFC 6238 TOTP Two-Factor Authentication.'}
              {authStep === 'ENROLL_2FA' &&
                `Scan the QR code below with Google Authenticator, Authy, or 1Password for ${verifiedEmail}, then enter the 6-digit code to activate 2FA.`}
              {authStep === 'VERIFY_2FA' &&
                `Enter the 6-digit TOTP verification code from your authenticator app for ${verifiedEmail}.`}
              {authStep === 'RECOVERY_CODES' &&
                'Store these 8 single-use backup codes in a safe place. They allow emergency sign-in if your authenticator device is unavailable.'}
            </p>
          </div>

          {/* Lockout Banner */}
          {lockoutSeconds > 0 && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950 text-red-100 border border-red-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-red-300">Temporary Security Lockout Active</p>
                <p className="mt-0.5 text-red-200">
                  Too many failed authentication attempts. Please wait{' '}
                  <span className="font-mono font-bold text-white">
                    {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s
                  </span>{' '}
                  before trying again.
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium space-y-1">
              <p>{authError}</p>
              {typeof remainingAttempts === 'number' && remainingAttempts > 0 && (
                <p className="text-[11px] text-red-600 font-semibold">
                  Remaining attempts before 15-minute lockout: {remainingAttempts}
                </p>
              )}
            </div>
          )}

          {/* STEP 1: PRIMARY LOGIN */}
          {authStep === 'PRIMARY_LOGIN' && (
            <div className="space-y-4">
              {/* Login Method Tabs */}
              <div className="flex bg-stone-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('passcode'); setAuthError(''); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMethod === 'passcode'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Owner Passcode
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('google'); setAuthError(''); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMethod === 'google'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Google Sign-In
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('email'); setAuthError(''); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMethod === 'email'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Email & Password
                </button>
              </div>

              {/* METHOD 1: OWNER PASSCODE (INSTANT ACCESS) */}
              {loginMethod === 'passcode' && (
                <form onSubmit={handlePasscodeLogin} className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
                    <p className="font-bold">Instant Owner Access</p>
                    <p className="text-emerald-800 mt-0.5">
                      Enter the master store owner passcode to access your dashboard immediately with no billing or card required.
                    </p>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={ownerPinInput}
                      onChange={(e) => setOwnerPinInput(e.target.value)}
                      placeholder="Enter Owner Passcode"
                      disabled={lockoutSeconds > 0}
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSigningIn || lockoutSeconds > 0}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSigningIn ? 'Unlocking Admin...' : 'Unlock Admin Panel'}
                  </button>
                </form>
              )}

              {/* METHOD 2: GOOGLE SIGN-IN */}
              {loginMethod === 'google' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Sign in with your verified administrator Google account (<code className="font-bold text-stone-800">yoyokishwar@gmail.com</code>).
                  </p>
                  <button
                    type="button"
                    disabled={isSigningIn || lockoutSeconds > 0}
                    onClick={handleGoogleAdminLogin}
                    className="w-full flex items-center justify-center gap-2.5 bg-stone-900 hover:bg-black text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                    <span>{isSigningIn ? 'Verifying Administrator...' : 'Sign In with Google Account'}</span>
                  </button>
                </div>
              )}

              {/* METHOD 3: EMAIL & PASSWORD */}
              {loginMethod === 'email' && (
                <form onSubmit={handleEmailAdminLogin} className="space-y-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="Admin Email Address"
                      disabled={lockoutSeconds > 0}
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Admin Password"
                      disabled={lockoutSeconds > 0}
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSigningIn || lockoutSeconds > 0}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Continue to 2FA Verification
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 2A: FIRST-TIME TOTP 2FA ENROLLMENT */}
          {authStep === 'ENROLL_2FA' && enrollmentData && (
            <form onSubmit={handleVerify2FAEnrollment} className="space-y-4">
              <div className="flex flex-col items-center p-4 bg-stone-50 border border-stone-200 rounded-xl">
                {enrollmentData.qrCodeDataUrl && (
                  <img
                    src={enrollmentData.qrCodeDataUrl}
                    alt="TOTP 2FA QR Code"
                    className="w-44 h-44 rounded-lg border border-stone-200 bg-white p-2 mb-3"
                  />
                )}
                <p className="text-[11px] text-stone-500 font-medium mb-1">
                  Manual Setup Key (Base32):
                </p>
                <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-1.5 rounded-lg">
                  <code className="text-xs font-mono font-bold tracking-wider text-stone-800 select-all">
                    {enrollmentData.secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyText(enrollmentData.secret, 'secret')}
                    className="text-stone-500 hover:text-stone-900 p-1 cursor-pointer"
                    title="Copy Secret Key"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Enter 6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={lockoutSeconds > 0}
                  className="w-full text-center tracking-[0.5em] font-mono text-lg py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <button
                type="submit"
                disabled={isSigningIn || lockoutSeconds > 0 || totpCode.length !== 6}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSigningIn ? 'Activating 2FA...' : 'Verify & Enable 2FA'}
              </button>
            </form>
          )}

          {/* STEP 2B: TOTP OR BACKUP RECOVERY CODE CHALLENGE */}
          {authStep === 'VERIFY_2FA' && (
            <form onSubmit={handleVerify2FAChallenge} className="space-y-4">
              {!useRecoveryMode ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    6-Digit Authenticator Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    disabled={lockoutSeconds > 0}
                    className="w-full text-center tracking-[0.5em] font-mono text-lg py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Single-Use Backup Recovery Code
                  </label>
                  <input
                    type="text"
                    value={recoveryCodeInput}
                    onChange={(e) => setRecoveryCodeInput(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    disabled={lockoutSeconds > 0}
                    className="w-full text-center tracking-widest font-mono text-base py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-emerald-700"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Remaining unused recovery codes: <span className="font-semibold">{remainingRecoveryCount}</span>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSigningIn || lockoutSeconds > 0}
                className="w-full bg-stone-900 hover:bg-black text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSigningIn ? 'Verifying 2FA...' : 'Verify & Unlock Admin Panel'}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryMode((prev) => !prev);
                    setAuthError('');
                  }}
                  className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                >
                  {useRecoveryMode ? 'Use 6-digit Authenticator Code' : 'Use a Backup Recovery Code instead'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreAuthToken('');
                    setAuthError('');
                    setAuthStep('PRIMARY_LOGIN');
                  }}
                  className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Switch Account
                </button>
              </div>
            </form>
          )}

          {/* STEP 2C: DISPLAY NEWLY ISSUED RECOVERY CODES AFTER ENROLLMENT */}
          {authStep === 'RECOVERY_CODES' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-bold">Save these 8 single-use recovery codes now.</p>
                <p className="mt-0.5 text-amber-800">
                  For security, these plaintext codes will only be shown once. Each code can be used a single time if you lose your phone.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs font-bold text-stone-800 text-center">
                {issuedRecoveryCodes.map((code) => (
                  <div key={code} className="py-1.5 px-2 bg-white border border-stone-200 rounded-lg select-all">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(issuedRecoveryCodes.join('\n'), 'recovery')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {copiedRecovery ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                  {copiedRecovery ? 'Copied!' : 'Copy Codes'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadRecoveryCodes(issuedRecoveryCodes)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download .TXT
                </button>
              </div>

              <button
                type="button"
                onClick={() => setAuthStep('AUTHENTICATED')}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                I Have Saved My Codes — Enter Admin Panel
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-4 bg-stone-100 text-stone-700 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-stone-200 transition-colors cursor-pointer"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'banners', label: 'Hero Banners', icon: Images },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'payments', label: 'Razorpay & Payments', icon: CreditCard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'analytics', label: 'Usage & Analytics', icon: BarChart },
    { id: 'audit', label: 'Audit Log', icon: ShieldAlert },
    { id: 'promotions', label: 'Promotions', icon: Tag },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'delivery', label: 'Delivery Mgmt', icon: MapPin },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] bg-brand-gray-50 flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="w-64 bg-brand-white border-r border-brand-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-brand-gray-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-brand-black">JIYOO Admin</h1>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800"
                title="2FA-Verified Signed Admin Session"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                2FA
              </span>
            </div>
            <p className="text-xs text-brand-gray-500 truncate max-w-[200px]">
              {securityStatus?.email || verifiedEmail || user?.email || 'Control Panel'}
            </p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-gray-900 text-brand-white'
                    : 'text-brand-gray-600 hover:bg-brand-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-brand-gray-200 space-y-2">
          <button
            type="button"
            onClick={async () => {
              const st = await fetchAdminSecurityStatus();
              if (st) setSecurityStatus(st);
              setRegeneratedCodes(null);
              setRegenError('');
              setShowSecurityModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" /> Security &amp; 2FA
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdminSignOut}
              title="Revoke 2FA Session & Lock Admin"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Lock 2FA
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-gray-100 hover:bg-brand-gray-200 text-brand-black rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Mobile Header & Tabs */}
        <div className="md:hidden bg-brand-white border-b border-brand-gray-200 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-serif font-bold text-brand-black">JIYOO Admin</h2>
            <button
              type="button"
              onClick={() => setShowSecurityModal(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> 2FA Protected
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleAdminSignOut}
              title="Lock 2FA Session"
              className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-brand-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-brand-gray-600" />
            </button>
          </div>
        </div>
        <div className="md:hidden bg-brand-white border-b border-brand-gray-200 shrink-0 overflow-x-auto scrollbar-hide">
          <div className="flex flex-wrap p-2 gap-2 justify-center">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as Tab)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === t.id
                      ? 'bg-brand-gray-900 text-brand-white'
                      : 'bg-brand-gray-50 text-brand-gray-600 hover:bg-brand-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-[calc(2rem+env(safe-area-inset-bottom))] relative custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
                  </div>
                }
              >
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'banners' && <BannersTab />}
                {activeTab === 'products' && <ProductsTab />}
                {activeTab === 'orders' && <OrdersTab />}
                {activeTab === 'payments' && <PaymentsTab />}
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'categories' && <CategoriesTab />}
                {activeTab === 'analytics' && <AnalyticsTab />}
                {activeTab === 'audit' && <AuditLogTab />}
                {activeTab === 'promotions' && <PromotionsTab />}
                {activeTab === 'reviews' && <ReviewsTab />}
                {activeTab === 'shipping' && <ShippingTab />}
                {activeTab === 'delivery' && <DeliveryManagementTab />}
                {activeTab === 'marketing' && <MarketingTab />}
                {activeTab === 'settings' && <SettingsTab />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Security & 2FA Management Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-800" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900">
                    Admin Security, Rate Limiting &amp; 2FA
                  </h3>
                  <p className="text-xs text-stone-500">
                    {securityStatus?.email || verifiedEmail || user?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSecurityModal(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Active Session & 2FA Status */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 uppercase tracking-wider">
                    2FA Session Status
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white font-bold text-[10px]">
                    MFA VERIFIED
                  </span>
                </div>
                <p className="text-emerald-900">
                  Standard: <span className="font-semibold">{securityStatus?.securityPolicy?.totpStandard || 'RFC 6238 TOTP (SHA-1, 6 digits, 30s step, AES-256-GCM encrypted at rest)'}</span>
                </p>
                {securityStatus?.sessionExpiresAt && (
                  <p className="text-emerald-800">
                    Session Expires: <span className="font-mono">{new Date(securityStatus.sessionExpiresAt).toLocaleString()}</span>
                  </p>
                )}
                <p className="text-emerald-800">
                  Remaining Single-Use Recovery Codes:{' '}
                  <span className="font-bold">{securityStatus?.remainingRecoveryCodes ?? remainingRecoveryCount}</span>
                </p>
              </div>

              {/* Active Rate Limiting & Lockout Policy */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                <p className="font-bold text-stone-900 uppercase tracking-wider">
                  Active Rate Limiting &amp; Brute-Force Protection
                </p>
                <ul className="space-y-1 text-stone-600">
                  <li>• Primary Auth Limit: <span className="font-semibold text-stone-800">{securityStatus?.securityPolicy?.authRateLimit || '8 requests / 15 minutes per IP'}</span></li>
                  <li>• 2FA Verification Limit: <span className="font-semibold text-stone-800">{securityStatus?.securityPolicy?.twoFactorRateLimit || '6 requests / 15 minutes per IP'}</span></li>
                  <li>• Admin API Mutation Limit: <span className="font-semibold text-stone-800">{securityStatus?.securityPolicy?.apiRateLimit || '120 requests / 5 minutes per IP'}</span></li>
                  <li>• Brute-Force Lockout: <span className="font-semibold text-stone-800">{securityStatus?.securityPolicy?.bruteForceLockout || '5 failed attempts locks account & IP for 15 minutes'}</span></li>
                </ul>
              </div>

              {/* Regenerate Backup Recovery Codes */}
              <form onSubmit={handleRegenerateRecoveryCodes} className="p-4 border border-stone-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-stone-900 uppercase tracking-wider">
                    Regenerate 2FA Backup Recovery Codes
                  </p>
                  <RefreshCw className="w-4 h-4 text-stone-500" />
                </div>
                <p className="text-stone-500">
                  Enter a fresh 6-digit TOTP code from your authenticator app to invalidate old backup codes and issue 8 new single-use codes.
                </p>
                {regenError && (
                  <p className="text-red-600 font-medium">{regenError}</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={regenTotpCode}
                    onChange={(e) => setRegenTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit TOTP"
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-center tracking-widest text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isRegeneratingCodes || regenTotpCode.length !== 6}
                    className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-lg font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {isRegeneratingCodes ? 'Generating...' : 'Regenerate'}
                  </button>
                </div>

                {regeneratedCodes && (
                  <div className="pt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-1.5 p-3 bg-amber-50 border border-amber-200 rounded-lg font-mono font-bold text-stone-900 text-center">
                      {regeneratedCodes.map((c) => (
                        <div key={c} className="py-1 bg-white rounded border border-amber-200 select-all">
                          {c}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(regeneratedCodes.join('\n'), 'recovery')}
                        className="flex-1 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold text-stone-800 cursor-pointer"
                      >
                        {copiedRecovery ? 'Copied!' : 'Copy Codes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadRecoveryCodes(regeneratedCodes)}
                        className="flex-1 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold text-stone-800 cursor-pointer"
                      >
                        Download .TXT
                      </button>
                    </div>
                  </div>
                )}
              </form>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleAdminSignOut}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase tracking-wider cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Revoke Session &amp; Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => setShowSecurityModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

