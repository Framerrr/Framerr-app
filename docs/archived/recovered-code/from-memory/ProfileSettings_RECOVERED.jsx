import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Save, RotateCcw, Lock, Mail, UserCircle, Upload, X } from 'lucide-react';
import logger from '../../utils/logger';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

const ProfileSettings = () => {
    // User info
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const fileInputRef = useRef(null);

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
                    <p className="text-theme-secondary">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold mb-2 text-theme-primary">
                    Profile Settings
                </h2>
                <p className="text-sm text-theme-secondary">
                    Manage your personal profile and preferences
                </p>
            </div>

            {/* Profile Picture Section */}
            <div className="glass-subtle rounded-xl shadow-deep border border-theme p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
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
                                    className="w-24 h-24 min-w-[80px] min-h-[80px] max-w-[120px] max-h-[120px] aspect-square rounded-full object-cover border-2 border-theme"
                                />
                                <button
                                    onClick={handleRemoveProfilePicture}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-error hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                                    title="Remove picture"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="w-24 h-24 min-w-[80px] min-h-[80px] max-w-[120px] max-h-[120px] aspect-square rounded-full bg-theme-tertiary flex items-center justify-center">
                                <UserCircle size={48} className="text-theme-tertiary" />
                            </div>
                        )}
                    </div>

                    {/* Upload Button */}
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            disabled={uploadingPicture}
                            className="hidden"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPicture}
                            icon={Upload}
                        >
                            {uploadingPicture ? 'Uploading...' : 'Upload Picture'}
                        </Button>
                        <p className="text-xs text-theme-tertiary mt-2">
                            JPG, PNG, GIF or WebP. Max 5MB.
                        </p>
                    </div>
                </div>
            </div>

            {/* User Information Section */}
            <div className="glass-subtle rounded-xl shadow-deep border border-theme p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                    <User size={20} />
                    User Information
                </h3>

                <div className="space-y-4">
                    {/* Username (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                            Username
                        </label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme-secondary">
                            <User size={18} />
                            <span>{username}</span>
                        </div>
                    </div>

                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                            Email
                        </label>
                        <div className="flex items-center gap-2 px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme-secondary">
                            <Mail size={18} />
                            <span>{email || 'Not set'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="glass-subtle rounded-xl shadow-deep border border-theme p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                    <Lock size={20} />
                    Change Password
                </h3>

                {passwordSuccess && (
                    <div className="bg-success/10 border border-success/20 text-success p-3 rounded-lg mb-4 text-sm">
                        Password changed successfully!
                    </div>
                )}

                {passwordError && (
                    <div className="bg-error/10 border border-error/20 text-error p-3 rounded-lg mb-4 text-sm">
                        {passwordError}
                    </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <Input
                        label="Current Password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                    />

                    <Input
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        helperText="At least 6 characters"
                    />

                    <Input
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                    />

                    <Button
                        type="submit"
                        disabled={changingPassword}
                        icon={Lock}
                    >
                        {changingPassword ? 'Changing...' : 'Change Password'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettings;
