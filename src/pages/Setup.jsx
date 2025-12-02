import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { User, Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const Setup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
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
            const setupResponse = await axios.post('/api/auth/setup', {
                username,
                password,
                confirmPassword,
                displayName: displayName || username
            });

            if (setupResponse.data.success) {
                // Auto-login after successful setup
                const loginResult = await login(username, password, true);

                if (loginResult.success) {
                    // Redirect to dashboard
                    navigate('/', { replace: true });
                } else {
                    setError('Setup successful, but auto-login failed. Please login manually.');
                    setTimeout(() => {
                        navigate('/login', { replace: true });
                    }, 2000);
                }
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Setup failed. Please try again.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-md mx-auto bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-accent">
                        <CheckCircle size={24} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-white">Welcome to Framerr</h2>
                    <p className="text-slate-400">Create your admin account to get started</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-slate-300">Username</label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full py-3 px-4 pl-11 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                                placeholder="Choose a username"
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Letters, numbers, underscores, and hyphens only</p>
                    </div>

                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-slate-300">Display Name (Optional)</label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full py-3 px-4 pl-11 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                                placeholder="Your display name"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-slate-300">Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full py-3 px-4 pl-11 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                                placeholder="Create a password"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium text-slate-300">Confirm Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full py-3 px-4 pl-11 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                                placeholder="Confirm your password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? <Loader size={18} className="animate-spin" /> : 'Create Admin Account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-500">
                    This will create the administrator account with full access to Framerr
                </div>
            </div>
        </div>
    );
};

export default Setup;
