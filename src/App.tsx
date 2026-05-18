import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { DuprUser, LoginResponse, ProfileResponse } from './types/dupr';

// Premium mock user for Demo / Mock mode
const MOCK_DUPR_USER: DuprUser = {
  id: 284951,
  fullName: "Tyson McGuffin",
  email: "tyson@mcguffin.com",
  gender: "MALE",
  duprId: "USA-8K9B4X",
  firstName: "Tyson",
  lastName: "McGuffin",
  ratings: {
    singles: {
      rating: "5.875",
      verified: true,
      halfLife: 14.2,
    },
    doubles: {
      rating: "6.142",
      verified: true,
      halfLife: 18.5,
    },
  },
};

function App() {
  // Session State - Restores from localStorage immediately on startup
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dupr_token'));
  const [user, setUser] = useState<DuprUser | null>(() => {
    const storedUser = localStorage.getItem('dupr_user');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [isDemo, setIsDemo] = useState<boolean>(() => localStorage.getItem('dupr_is_demo') === 'true');

  // Login Form State
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Copy to Clipboard Feedback
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch / Sync Profile in background if token exists
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    if (isDemo) {
      // Simulate network loading for demo mode
      setLoading(true);
      const timer = setTimeout(() => {
        setUser(MOCK_DUPR_USER);
        setLoading(false);
      }, 600);
      return () => clearTimeout(timer);
    }

    const fetchProfile = async () => {
      // If we don't have user info in state, show the loading spinner
      if (!user) {
        setLoading(true);
      }
      setFormError(null);

      try {
        const response = await axios.get<ProfileResponse>('/api/user/v1.0/profile/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = response.data.result || null;

        if (userData && (userData.fullName || userData.referralCode || userData.id)) {
          setUser(userData);
          localStorage.setItem('dupr_user', JSON.stringify(userData));
        } else {
          throw new Error('Invalid profile data received from DUPR.');
        }
      } catch (err: any) {
        console.error('Failed to sync profile:', err);
        // If we already have a cached profile, we don't crash, we just use it!
        const storedUser = localStorage.getItem('dupr_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setIsDemo(true);
            setUser(MOCK_DUPR_USER);
          }
        } else {
          const errMsg = err.response?.data?.message || err.message || 'Failed to retrieve profile data.';
          setFormError(`API Connection Warning: ${errMsg}. Loading demo profile instead.`);
          setIsDemo(true);
          setUser(MOCK_DUPR_USER);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, isDemo]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setFormError('Please fill in both your email and password.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    // Bypass check: If email is "demo@dupr.gg", directly activate Demo Mode
    if (email.toLowerCase() === 'demo@dupr.gg') {
      const demoToken = 'mock_token_mcguffin_12345';
      localStorage.setItem('dupr_token', demoToken);
      localStorage.setItem('dupr_is_demo', 'true');
      localStorage.setItem('dupr_user', JSON.stringify(MOCK_DUPR_USER));
      setToken(demoToken);
      setUser(MOCK_DUPR_USER);
      setIsDemo(true);
      setSubmitting(false);
      return;
    }

    try {
      const response = await axios.post<LoginResponse>('/api/auth/v1.0/login', {
        email,
        password,
      });

      // Handle nested accessToken key
      const tokenReceived = response.data.result?.accessToken;

      // Extract user info from response
      const userData = response.data.result?.user;

      if (tokenReceived) {
        localStorage.setItem('dupr_token', tokenReceived);
        localStorage.setItem('dupr_is_demo', 'false');
        setToken(tokenReceived);
        setIsDemo(false);

        if (userData) {
          localStorage.setItem('dupr_user', JSON.stringify(userData));
          setUser(userData);
        }
      } else {
        throw new Error('Authentication succeeded but no secure accessToken was returned by DUPR.');
      }
    } catch (err: any) {
      console.error('Login request failed:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Check your credentials and try again.';
      setFormError(`Authentication Failed: ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Mock/Demo Flow directly
  const handleDemoLogin = () => {
    setEmail('demo@dupr.gg');
    setPassword('password123');
    setFormError(null);
    const demoToken = 'mock_token_mcguffin_12345';
    localStorage.setItem('dupr_token', demoToken);
    localStorage.setItem('dupr_is_demo', 'true');
    localStorage.setItem('dupr_user', JSON.stringify(MOCK_DUPR_USER));
    setToken(demoToken);
    setUser(MOCK_DUPR_USER);
    setIsDemo(true);
  };

  // Sign out handler
  const handleSignOut = () => {
    localStorage.removeItem('dupr_token');
    localStorage.removeItem('dupr_is_demo');
    localStorage.removeItem('dupr_user');
    setToken(null);
    setUser(null);
    setIsDemo(false);
    setEmail('');
    setPassword('');
    setFormError(null);
  };

  // Copy DUPR ID to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ==========================================
  // REAL-DATA RETRIEVAL HELPERS
  // ==========================================

  // Get display name (real or mock)
  const getPlayerName = () => {
    if (!user) return 'DUPR Player';
    if (user.fullName) return user.fullName;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return 'DUPR Player';
  };

  // Get initials for profile card avatar
  const getPlayerInitials = () => {
    if (!user) return 'DP';
    const name = getPlayerName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Get unique player identifier
  const getPlayerId = () => {
    return user?.referralCode || user?.duprId || 'USA-XXXXXX';
  };

  // Doubles rating getters
  const getDoublesRating = () => {
    if (user?.stats) {
      return String(user.stats.doubles);
    }
    return user?.ratings?.doubles.rating || 'NR';
  };

  const isDoublesVerified = () => {
    if (user?.stats) {
      return user.stats.doublesVerified !== 'NR';
    }
    return user?.ratings?.doubles.verified || false;
  };

  const getDoublesStatus = () => {
    if (user?.stats) {
      return user.stats.doublesProvisional ? 'Provisional' : 'Verified Rating';
    }
    return user?.ratings?.doubles.halfLife ? `Weight: ${user.ratings.doubles.halfLife}%` : 'N/A';
  };

  // Singles rating getters
  const getSinglesRating = () => {
    if (user?.stats) {
      return String(user.stats.singles);
    }
    return user?.ratings?.singles.rating || 'NR';
  };

  const isSinglesVerified = () => {
    if (user?.stats) {
      return user.stats.singlesVerified !== 'NR';
    }
    return user?.ratings?.singles.verified || false;
  };

  const getSinglesStatus = () => {
    if (user?.stats) {
      return user.stats.singlesProvisional ? 'Provisional' : 'Verified Rating';
    }
    return user?.ratings?.singles.halfLife ? `Weight: ${user.ratings.singles.halfLife}%` : 'N/A';
  };

  // Safe rating progress bar width calculator
  const getProgressWidth = (ratingStr: string) => {
    const val = parseFloat(ratingStr);
    if (isNaN(val)) return 0; // "NR" resolves to 0 width safely
    return Math.min(100, (val / 8.0) * 100);
  };

  // Address/Location getter
  const getPlayerLocation = () => {
    if (user?.addresses && user.addresses.length > 0) {
      return user.addresses[0].shortAddress;
    }
    return 'Location N/A';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Sleek Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                DUPR
              </span>
              <span className="text-slate-400 font-semibold text-sm ml-1.5 uppercase tracking-wider">
                Hub
              </span>
            </div>
          </div>

          {token && (
            <div className="flex items-center gap-4">
              {isDemo && (
                <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Demo Session
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition duration-200 cursor-pointer shadow-sm"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Body Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {!token ? (
          /* ========================================================
             1. LOGIN VIEW
             ======================================================== */
          <div className="w-full max-w-md">
            {/* Visual Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 sm:text-4xl">
                Player Authentication
              </h2>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                Securely sign in to DUPR's rating database to view your verified singles & doubles metrics.
              </p>
            </div>

            {/* Login Card */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-emerald-950/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

              {formError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. player@pickleball.com"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500/80 rounded-xl py-3 pl-11 pr-11 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-slate-950 font-bold bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 disabled:cursor-not-allowed transition duration-200 shadow-lg shadow-emerald-500/20 active:translate-y-[1px] cursor-pointer"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Verifying Credentials...</span>
                    </div>
                  ) : (
                    <span>Sign In with DUPR</span>
                  )}
                </button>
              </form>

              {/* Demo Mode Trigger Section */}
              <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
                <p className="text-xs text-slate-500 mb-3.5">
                  Don't have active credentials or facing CORS limits?
                </p>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-bold transition duration-200 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Explore with Demo Profile
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             2. DASHBOARD VIEW
             ======================================================== */
          <div className="w-full max-w-4xl space-y-6">
            {/* Warning/Error Banners */}
            {formError && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="font-bold mb-1">Demo Mode Activated</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{formError}</p>
                </div>
                <button
                  onClick={() => setFormError(null)}
                  className="text-slate-500 hover:text-slate-300 text-xs font-bold px-2 py-1 rounded"
                >
                  Dismiss
                </button>
              </div>
            )}

            {loading ? (
              /* Loading Spinner Card */
              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md" />
                  <svg className="animate-spin h-12 w-12 text-emerald-400 relative z-10" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <p className="text-emerald-400 font-bold tracking-wider text-sm animate-pulse uppercase">
                  Fetching DUPR Stats...
                </p>
                <p className="text-xs text-slate-500">
                  Retrieving your latest universal pickleball profile.
                </p>
              </div>
            ) : user ? (
              /* Main Stats Layout */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* A. PLAYER PROFILE CARD */}
                <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
                  {/* Decorative glow */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="space-y-6">
                    {/* User Info Header */}
                    <div className="flex flex-col items-center text-center pt-4">
                      {/* Stylized Player Initials Avatar */}
                      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-2xl tracking-widest shadow-inner mb-4 select-none relative group">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-10 transition duration-300" />
                        {getPlayerInitials()}
                      </div>

                      {/* Full Name */}
                      <h3 className="text-xl font-extrabold text-white tracking-tight">
                        {getPlayerName()}
                      </h3>

                      {/* Gender Badge */}
                      <span className="mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-400 border border-slate-700/80">
                        {user.gender === 'MALE' ? 'Male Player' : 'Female Player'}
                      </span>
                    </div>

                    {/* Meta Stats list */}
                    <div className="space-y-3 pt-2 border-t border-slate-850">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                          DUPR Identifier
                        </span>
                        <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2">
                          <code className="font-mono text-emerald-400 text-xs font-bold tracking-wider">
                            {getPlayerId()}
                          </code>
                          <button
                            onClick={() => copyToClipboard(getPlayerId())}
                            className="p-1 text-slate-500 hover:text-emerald-400 rounded transition duration-150 cursor-pointer"
                            title="Copy DUPR ID"
                          >
                            {copied ? (
                              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/40">
                        <span className="text-slate-500 font-semibold">Location</span>
                        <span className="text-slate-305 font-semibold text-right max-w-[150px] truncate">{getPlayerLocation()}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/40">
                        <span className="text-slate-500 font-semibold">Email Account</span>
                        <span className="text-slate-300 font-bold truncate max-w-[150px]">{user.email}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/40">
                        <span className="text-slate-500 font-semibold">Database ID</span>
                        <span className="font-mono text-slate-300 font-bold">{user.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-850 mt-6 lg:mt-0">
                    <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">
                        Connection: Synchronized
                      </span>
                    </div>
                  </div>
                </div>

                {/* B. RATINGS BREAKDOWN */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Summary / Headline Panel */}
                  <div className="bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent border border-emerald-500/10 rounded-3xl p-6">
                    <h4 className="text-lg font-bold text-white mb-1">
                      Universal Pickleball Ratings
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Your ratings are dynamically calculated based on recent tournament submissions, verified recreational matches, and direct opponent multipliers.
                    </p>
                  </div>

                  {/* Ratings Cards Grid (Singles & Doubles Side by Side) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* 1. DOUBLES CARD */}
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between group shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

                      <div>
                        {/* Title Row */}
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-xs font-black tracking-widest text-slate-500 uppercase">
                            Doubles Rating
                          </span>
                          {isDoublesVerified() ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Unverified
                            </span>
                          )}
                        </div>

                        {/* Rating Display */}
                        <div className="space-y-1 mb-6">
                          <span className="block text-4xl sm:text-5xl font-black tracking-tighter text-white">
                            {getDoublesRating()}
                          </span>
                          <span className="block text-xs text-slate-400">
                            Universal rating score
                          </span>
                        </div>
                      </div>

                      {/* Spark / Gauge graphic and metrics */}
                      <div className="border-t border-slate-850 pt-4 mt-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold">Activity Weight</span>
                          <span className="text-slate-300 font-bold font-mono">
                            {getDoublesStatus()}
                          </span>
                        </div>
                        {/* Visual rating metric progress indicator */}
                        <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            style={{ width: `${getProgressWidth(getDoublesRating())}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. SINGLES CARD */}
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between group shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

                      <div>
                        {/* Title Row */}
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-xs font-black tracking-widest text-slate-500 uppercase">
                            Singles Rating
                          </span>
                          {isSinglesVerified() ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Unverified
                            </span>
                          )}
                        </div>

                        {/* Rating Display */}
                        <div className="space-y-1 mb-6">
                          <span className="block text-4xl sm:text-5xl font-black tracking-tighter text-white">
                            {getSinglesRating()}
                          </span>
                          <span className="block text-xs text-slate-400">
                            Universal rating score
                          </span>
                        </div>
                      </div>

                      {/* Spark / Gauge graphic and metrics */}
                      <div className="border-t border-slate-850 pt-4 mt-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold">Activity Weight</span>
                          <span className="text-slate-300 font-bold font-mono">
                            {getSinglesStatus()}
                          </span>
                        </div>
                        {/* Visual rating metric progress indicator */}
                        <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            style={{ width: `${getProgressWidth(getSinglesRating())}%` }}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              /* If somehow token exists but user object is empty/null and not loading */
              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-3xl p-10 text-center space-y-4">
                <p className="text-slate-400 text-sm">
                  Failed to resolve player session details.
                </p>
                <button
                  onClick={handleSignOut}
                  className="px-6 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl hover:bg-emerald-400 transition"
                >
                  Clear Session & Return
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modern Mini Footer */}
      <footer className="py-6 border-t border-slate-900 text-center">
        <p className="text-xs text-slate-600">
          DUPR Hub • Client-Side Integration Service • Unofficial Dashboard
        </p>
      </footer>
    </div>
  );
}

export default App;
