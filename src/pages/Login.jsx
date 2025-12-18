import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Lock, User, AlertCircle, Loader, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [plexSSOEnabled, setPlexSSOEnabled] = useState(false);
    const [plexLoading, setPlexLoading] = useState(false);
    const { login, loginWithPlex, isAuthenticated, loading: authLoading } = useAuth();
    const { success: showSuccess, info: showInfo, error: showError } = useNotifications();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';
    const loggedOut = location.state?.loggedOut;

    // Check if Plex SSO is enabled
    // Note: This can fail with CORS errors when behind an auth proxy (e.g., Authentik)
    // In that case, we just disable the Plex SSO button - that's fine
    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                const response = await axios.get('/api/plex/sso/status');
                setPlexSSOEnabled(response.data.enabled);
            } catch (error) {
                // SSO not available or CORS error from auth proxy - that's fine
                // Just leave plexSSOEnabled as false
            }
        }, 100); // Small delay to let page stabilize

        return () => clearTimeout(timer);
    }, []);

    // Show logout message if coming from logout
    useEffect(() => {
        if (loggedOut) {
            showInfo('Goodbye!', 'You have been logged out');
            navigate('/login', { replace: true, state: {} });
        }
    }, [loggedOut, showInfo, navigate]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    // Check for pending Plex auth on page load (redirect flow)
    useEffect(() => {
        let hasCompleted = false;

        const completePlexAuth = async () => {
            const pendingPinId = localStorage.getItem('plexPendingPinId');
            if (!pendingPinId || hasCompleted) return;

            hasCompleted = true;
            setPlexLoading(true);

            try {
                // Check if the PIN has been claimed
                const tokenResponse = await axios.get(`/api/plex/auth/token?pinId=${pendingPinId}`);

                if (tokenResponse.data.authToken) {
                    const { authToken, user } = tokenResponse.data;
                    const result = await loginWithPlex(authToken, user.id);

                    localStorage.removeItem('plexPendingPinId');

                    if (result.success) {
                        showSuccess('Welcome!', `Signed in as ${user.username}`);
                        navigate(from, { replace: true });
                    } else {
                        setError(result.error || 'Plex login failed');
                    }
                } else {
                    // Token not ready yet - this shouldn't happen with the redirect flow
                    localStorage.removeItem('plexPendingPinId');
                    setError('Plex authentication incomplete. Please try again.');
                }
            } catch (error) {
                localStorage.removeItem('plexPendingPinId');
                if (error.response?.status === 404) {
                    setError('Plex authentication expired. Please try again.');
                } else {
                    setError(error.response?.data?.error || 'Failed to complete Plex login');
                }
            } finally {
                setPlexLoading(false);
            }
        };

        completePlexAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(username, password, rememberMe);
            if (result.success) {
                showSuccess('Welcome!', 'You have successfully logged in');
                navigate(from, { replace: true });
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handlePlexLogin = async () => {
        setPlexLoading(true);
        setError('');

        try {
            const pinResponse = await axios.post('/api/plex/auth/pin', {
                forwardUrl: `${window.location.origin}/login`
            });

            const { pinId, authUrl } = pinResponse.data;

            // Store PIN ID for when we return from Plex
            localStorage.setItem('plexPendingPinId', pinId.toString());

            // Redirect to Plex (no popup, full page redirect)
            window.location.href = authUrl;

        } catch (error) {
            setError(error.response?.data?.error || 'Failed to connect to Plex');
            setPlexLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-theme-primary p-4">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 30 }}
                >
                    <motion.div
                        className="w-12 h-12 border-4 border-theme rounded-full mx-auto mb-4"
                        style={{ borderTopColor: 'var(--accent)' }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-theme-secondary">Checking authentication...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-theme-primary p-4">
            <motion.div
                className="w-full max-w-md mx-auto glass-subtle p-10 rounded-2xl shadow-xl border border-theme"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 30 }}
            >
                <div className="text-center mb-10">
                    <motion.div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-accent shadow-lg"
                        style={{ boxShadow: '0 0 30px var(--accent-glow)' }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 30 }}
                    >
                        <Lock size={28} className="text-white" />
                    </motion.div>
                    <motion.h2
                        className="text-3xl font-bold mb-2 text-theme-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Welcome Back
                    </motion.h2>
                    <motion.p
                        className="text-theme-secondary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Sign in to access your dashboard
                    </motion.p>
                </div>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            className="p-4 rounded-lg mb-6 flex items-center gap-3 text-sm border"
                            style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderColor: 'rgba(239, 68, 68, 0.2)',
                                color: 'var(--error)'
                            }}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                x: [0, -5, 5, -5, 5, 0]
                            }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{
                                opacity: { duration: 0.2 },
                                y: { type: "spring", stiffness: 220, damping: 30 },
                                x: { duration: 0.4 }
                            }}
                        >
                            <AlertCircle size={18} />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <label className="block mb-2 text-sm font-medium text-theme-primary">Username</label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-tertiary transition-colors peer-focus:text-accent" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="peer w-full py-3.5 px-4 pl-12 bg-theme-primary border-2 border-theme rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-accent transition-all"
                                style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' }}
                                placeholder="Enter your username"
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium text-theme-primary">Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-tertiary transition-colors peer-focus:text-accent" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="peer w-full py-3.5 px-4 pl-12 bg-theme-primary border-2 border-theme rounded-xl text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-accent transition-all"
                                style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' }}
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    <div className="flex items-center mb-8">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-theme bg-theme-tertiary text-accent focus:ring-accent focus:ring-offset-0 transition-all cursor-pointer"
                        />
                        <label htmlFor="remember" className="ml-3 text-sm text-theme-secondary cursor-pointer select-none hover:text-theme-primary transition-colors">Remember me</label>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 px-4 bg-accent text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        style={{ boxShadow: loading ? 'none' : '0 4px 14px var(--accent-glow)' }}
                        whileHover={!loading ? { scale: 1.02, boxShadow: '0 6px 20px var(--accent-glow)' } : {}}
                        whileTap={!loading ? { scale: 0.98 } : {}}
                        transition={{ type: "spring", stiffness: 220, damping: 30 }}
                    >
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Loader size={20} />
                                    </motion.div>
                                    Signing in...
                                </motion.div>
                            ) : (
                                <motion.span
                                    key="signin"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    Sign In
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </form>

                {/* Plex SSO Button */}
                {plexSSOEnabled && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-theme"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="px-2 bg-theme-secondary text-theme-tertiary rounded">or</span>
                            </div>
                        </div>

                        <motion.button
                            type="button"
                            onClick={handlePlexLogin}
                            disabled={plexLoading}
                            className="w-full py-4 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                            style={{
                                backgroundColor: '#e5a00d',
                                color: '#000',
                                boxShadow: '0 4px 14px rgba(229, 160, 13, 0.3)'
                            }}
                            whileHover={!plexLoading ? { scale: 1.02, boxShadow: '0 6px 20px rgba(229, 160, 13, 0.4)' } : {}}
                            whileTap={!plexLoading ? { scale: 0.98 } : {}}
                        >
                            {plexLoading ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    Connecting to Plex...
                                </>
                            ) : (
                                <>
                                    <ExternalLink size={20} />
                                    Sign in with Plex
                                </>
                            )}
                        </motion.button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default Login;
