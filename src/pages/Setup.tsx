import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios, { AxiosError } from 'axios';
import { User, Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

interface SetupApiResponse {
    success: boolean;
}

const Setup = (): React.JSX.Element => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [displayName, setDisplayName] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const { login, checkSetupStatus } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Client-side validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            // Create admin user via setup endpoint
            const setupResponse = await axios.post<SetupApiResponse>('/api/auth/setup', {
                username,
                password,
                confirmPassword,
                displayName: displayName || username
            });

            if (setupResponse.data.success) {
                // Update setup status to reflect that admin account now exists
                await checkSetupStatus();

                // Redirect to login page for manual login
                navigate('/login', { replace: true });
            }
        } catch (err) {
            const axiosError = err as AxiosError<{ error?: string }>;
            const errorMsg = axiosError.response?.data?.error || 'Setup failed. Please try again.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-theme-primary p-4">
            <motion.div
                className="w-full max-w-md mx-auto glass-subtle p-8 rounded-2xl shadow-xl border border-theme"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 30 }}
            >
                <div className="text-center mb-8">
                    <motion.div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-accent"
                        style={{ boxShadow: '0 0 20px var(--accent-glow)' }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 30 }}
                    >
                        <CheckCircle size={24} className="text-white" />
                    </motion.div>
                    <motion.h2
                        className="text-2xl font-bold mb-2 text-theme-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Welcome to Framerr
                    </motion.h2>
                    <motion.p
                        className="text-theme-secondary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Create your admin account to get started
                    </motion.p>
                </div>

                {error && (
                    <motion.div
                        className="p-3 rounded-lg mb-6 flex items-center gap-2 text-sm border"
                        style={{
                            backgroundColor: 'var(--error-bg, rgba(239, 68, 68, 0.1))',
                            borderColor: 'var(--error-border, rgba(239, 68, 68, 0.2))',
                            color: 'var(--error)'
                        }}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <AlertCircle size={16} />
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-theme-primary">Username</label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-tertiary" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full py-3 px-4 pl-11 bg-theme-primary border-2 border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-accent transition-colors"
                                placeholder="Choose a username"
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-theme-tertiary mt-1">Letters, numbers, underscores, and hyphens only</p>
                    </div>

                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-theme-primary">Display Name (Optional)</label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-tertiary" />
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full py-3 px-4 pl-11 bg-theme-primary border-2 border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-accent transition-colors"
                                placeholder="Your display name"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-theme-primary">Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-tertiary" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full py-3 px-4 pl-11 bg-theme-primary border-2 border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-accent transition-colors"
                                placeholder="Create a password"
                            />
                        </div>
                        <p className="text-xs text-theme-tertiary mt-1">At least 6 characters</p>
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium text-theme-primary">Confirm Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-tertiary" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full py-3 px-4 pl-11 bg-theme-primary border-2 border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-accent transition-colors"
                                placeholder="Confirm your password"
                            />
                        </div>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        style={{ boxShadow: loading ? 'none' : '0 4px 14px var(--accent-glow)' }}
                        whileHover={!loading ? { scale: 1.02 } : {}}
                        whileTap={!loading ? { scale: 0.98 } : {}}
                    >
                        {loading ? <Loader size={18} className="animate-spin" /> : 'Create Admin Account'}
                    </motion.button>
                </form>

                <div className="mt-6 text-center text-xs text-theme-tertiary">
                    This will create the administrator account with full access to Framerr
                </div>
            </motion.div>
        </div>
    );
};

export default Setup;
