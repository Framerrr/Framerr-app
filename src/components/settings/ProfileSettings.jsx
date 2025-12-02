import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Save, RotateCcw, Lock, Mail, UserCircle, Upload, X } from 'lucide-react';
import logger from '../../utils/logger';

const ProfileSettings = () => {
    // User info
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);


    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [uploadingPicture, setUploadingPicture] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Load user profile and preferences on mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                // Load profile info
                const profileResponse = await axios.get('/api/profile', {
                    withCredentials: true
                });
                setUsername(profileResponse.data.username || '');
                setEmail(profileResponse.data.email || '');
                setProfilePicture(profileResponse.data.profilePicture || null);

            } catch (error) {
                logger.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);


    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess(false);

        // Validation
        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        setChangingPassword(true);
        try {
            await axios.put('/api/profile/password', {
                currentPassword,
                newPassword
            }, {
                withCredentials: true
            });

            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setPasswordError(error.response?.data?.error || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleProfilePictureUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', file);

        setUploadingPicture(true);
        try {
            const response = await axios.post('/api/profile/picture', formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setProfilePicture(response.data.profilePicture);
        } catch (error) {
            logger.error('Failed to upload profile picture:', error);
            alert(error.response?.data?.error || 'Failed to upload profile picture');
        } finally {
            setUploadingPicture(false);
        }
    };

    const handleRemoveProfilePicture = async () => {
        if (!confirm('Remove your profile picture?')) return;

        try {
            await axios.delete('/api/profile/picture', {
                withCredentials: true
            });
            setProfilePicture(null);
        } catch (error) {
            logger.error('Failed to remove profile picture:', error);
            alert('Failed to remove profile picture');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold mb-2 text-white">
                    Profile Settings
                </h2>
                <p className="text-sm text-slate-400">
                    Manage your personal profile and preferences
                </p>
            </div>

            {/* Profile Picture Section */}
            <div className="glass-subtle rounded-xl shadow-deep border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <UserCircle size={20} />
                    Profile Picture
                </h3>

                <div className="flex items-center gap-6">
                    {/* Picture Display */}
                    <div className="relative">
                        {profilePicture ? (
                            <div className="relative">
                                <img
                                    src={profilePicture}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full object-cover border-2 border-slate-600"
                                />
                                <button
                                    onClick={handleRemoveProfilePicture}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors"
                                    title="Remove picture"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                                <UserCircle size={48} className="text-slate-500" />
                            </div>
                        )}
                    </div>

                    {/* Upload Button */}
                    <div>
                        <label className="button-elevated px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg cursor-pointer inline-flex items-center gap-2 transition-all" title="Upload profile picture">
                            <Upload size={18} />
                            <span className="hidden sm:inline">{uploadingPicture ? 'Uploading...' : 'Upload Picture'}</span>
                            <span className="sm:hidden">{uploadingPicture ? '...' : ''}</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleProfilePictureUpload}
                                disabled={uploadingPicture}
                                className="hidden"
                            />
                        </label>
                        <p className="text-xs text-slate-500 mt-2">
                            JPG, PNG, GIF or WebP. Max 5MB.
                        </p>
                    </div>
                </div>
            </div>

            {/* User Information Section */}
            <div className="glass-subtle rounded-xl shadow-deep border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <User size={20} />
                    User Information
                </h3>

                <div className="space-y-4">
                    {/* Username (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Username
                        </label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-400">
                            <User size={18} />
                            <span>{username}</span>
                        </div>
                    </div>

                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Email
                        </label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-400">
                            <Mail size={18} />
                            <span>{email || 'Not set'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="glass-subtle rounded-xl shadow-deep border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Lock size={20} />
                    Change Password
                </h3>

                {passwordSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg mb-4 text-sm">
                        Password changed successfully!
                    </div>
                )}

                {passwordError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
                        {passwordError}
                    </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Current Password
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="input-glow w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="input-glow w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                        />
                        <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="input-glow w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={changingPassword}
                        className="button-elevated px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white rounded-lg flex items-center gap-2 transition-all font-medium"
                    >
                        <Lock size={18} />
                        {changingPassword ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>


        </div>
    );
};

export default ProfileSettings;
