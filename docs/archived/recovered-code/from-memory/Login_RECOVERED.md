import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Loader } from 'lucide-react';
const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await login(username, password, rememberMe);
            if (result.success) {
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
    return (
        <>
            <style>{`
                @keyframes gradientShift {
                    0%, 100% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes formElementFade {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .login-container {
                    animation: fadeIn 0.6s ease-out;
                }
                .login-card {
                    animation: slideUp 0.8s ease-out 0.2s both;
                }
                .form-element-1 {
                    animation: formElementFade 0.5s ease-out 0.4s both;
                }
                .form-element-2 {
                    animation: formElementFade 0.5s ease-out 0.5s both;
                }
                .form-element-3 {
                    animation: formElementFade 0.5s ease-out 0.6s both;
                }
                .form-element-4 {
                    animation: formElementFade 0.5s ease-out 0.7s both;
                }
                .animated-gradient {
                    background: linear-gradient(-45deg, #0a0e1a, #1e1b4b, #1e3a8a, #0f172a, #0a0e1a);
                    background-size: 400% 400%;
                    animation: gradientShift 15s ease infinite;
                }
                .input-glow:focus {
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.2);
                }
                .button-elevated:hover {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 12px 24px rgba(59, 130, 246, 0.4), 0 6px 12px rgba(0, 0, 0, 0.6);
                }
                .button-elevated:active {
                    transform: translateY(0) scale(0.98);
                    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.4);
                }
                .glass-card {
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95));
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    box-shadow: 
                        0 24px 48px rgba(0, 0, 0, 0.6),
                        0 12px 24px rgba(0, 0, 0, 0.4),
                        0 0 0 1px rgba(71, 85, 105, 0.5),
                        inset 0 1px 0 rgba(255, 255, 255, 0.05);
                }
                .glass-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 1rem;
                    padding: 2px;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(6, 182, 212, 0.2));
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    pointer-events: none;
                }
            `}</style>

            <div className="min-h-screen w-full grid place-items-center animated-gradient p-4 login-container">
                <div className="w-full max-w-md login-card">
                    <div className="glass-card p-8 rounded-2xl relative">
                        <div className="text-center mb-8 form-element-1">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-accent shadow-lg shadow-blue-500/20">
                                <Lock size={32} className="drop-shadow-lg" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2 text-white bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                Welcome Back
                            </h2>
                            <p className="text-slate-400">Sign in to access your dashboard</p>
                        </div>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm backdrop-blur-sm form-element-1">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="form-element-2">
                                <label className="block mb-2 text-sm font-medium text-slate-300">Username</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="w-full py-3 px-4 pl-11 bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-all duration-300 input-glow"
                                        placeholder="Enter your username"
                                    />
                                </div>
                            </div>
                            <div className="form-element-3">
                                <label className="block mb-2 text-sm font-medium text-slate-300">Password</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full py-3 px-4 pl-11 bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-all duration-300 input-glow"
                                        placeholder="Enter your password"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center form-element-3">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700/80 text-accent focus:ring-accent focus:ring-offset-slate-800"
                                />
                                <label htmlFor="remember" className="ml-2 text-sm text-slate-400 cursor-pointer select-none">
                                    Remember me
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 button-elevated form-element-4 ${loading ? 'opacity-70 cursor-not-allowed' : 'shadow-lg shadow-blue-500/30'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader size={18} className="animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};
export default Login;
