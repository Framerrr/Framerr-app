import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import axios, { AxiosError } from 'axios';
import { User, Save, RotateCcw, Lock, Mail, UserCircle, Upload, X } from 'lucide-react';
import logger from '../../utils/logger';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProfileData {
    username: string;
    email: string;
    displayName: string;
    profilePicture: string | null;
}

const ProfileSettings: React.FC = () => {
    const { error: showError, success: showSuccess } = useNotifications();
    const { checkAuth } = useAuth();

    // User info
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [displayName, setDisplayName] = useState<string>('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password change
    const [currentPassword, setCurrentPassword] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');

    // UI state
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [changingPassword, setChangingPassword] = useState<boolean>(false);
    const [uploadingPicture, setUploadingPicture] = useState<boolean>(false);
    const [passwordError, setPasswordError] = useState<string>('');
    const [passwordSuccess, setPasswordSuccess] = useState<boolean>(false);
    const [confirmRemovePicture, setConfirmRemovePicture] = useState<boolean>(false);
    const [savingProfile, setSavingProfile] = useState<boolean>(false);

    // Load user profile and preferences on mount
    useEffect(() => {
        const loadProfile = async (): Promise<void> => {
            try {
                // Load profile info
                const profileResponse = await axios.get<ProfileData>('/api/profile', {
                    withCredentials: true
                });

                setUsername(profileResponse.data.username || '');
                setEmail(profileResponse.data.email || '');
                setDisplayName(profileResponse.data.displayName || profileResponse.data.username || '');

                // Add cache-busting timestamp to profile picture to prevent stale cache
                const picturePath = profileResponse.data.profilePicture;
                setProfilePicture(picturePath ? `${picturePath}?t=${Date.now()}` : null);
            } catch (error) {
                logger.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const handleSaveProfile = async (): Promise<void> => {
        setSavingProfile(true);
        try {
            await axios.put('/api/profile', {
                displayName
            }, {
                withCredentials: true
            });

            // Refresh auth context to update dashboard greeting immediately
            await checkAuth();

            showSuccess('Profile Saved', 'Your display name has been updated');
        } catch (error) {
            logger.error('Failed to save profile:', error);
            const axiosError = error as AxiosError<{ error?: string }>;
            showError('Save Failed', axiosError.response?.data?.error || 'Failed to save profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
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
            showSuccess('Password Changed', 'Your password has been updated successfully');
        } catch (error) {
            const axiosError = error as AxiosError<{ error?: string }>;
            setPasswordError(axiosError.response?.data?.error || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleProfilePictureUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('File Too Large', 'File size must be less than 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', file);

        setUploadingPicture(true);
        try {
            const response = await axios.post<{ profilePicture: string }>('/api/profile/picture', formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Add cache-busting timestamp to force browser refresh
            const pictureUrl = `${response.data.profilePicture}?t=${Date.now()}`;
            setProfilePicture(pictureUrl);

            // Dispatch event to notify Sidebar to refresh profile picture
            window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
                detail: { profilePicture: pictureUrl }
            }));
            showSuccess('Photo Updated', 'Profile picture uploaded successfully');
        } catch (error) {
            logger.error('Failed to upload profile picture:', error);
            const axiosError = error as AxiosError<{ error?: string }>;
            showError('Upload Failed', axiosError.response?.data?.error || 'Failed to upload profile picture');
        } finally {
            setUploadingPicture(false);
        }
    };

    const handleRemoveProfilePicture = async (): Promise<void> => {
        try {
            await axios.delete('/api/profile/picture', {
                withCredentials: true
            });
            setProfilePicture(null);
            setConfirmRemovePicture(false);

            // Dispatch event to notify Sidebar
            window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
                detail: { profilePicture: null }
            }));
            showSuccess('Photo Removed', 'Profile picture has been removed');
        } catch (error) {
            logger.error('Failed to remove profile picture:', error);
            showError('Remove Failed', 'Failed to remove profile picture');
            setConfirmRemovePicture(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="lg" message="Loading profile..." />
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in scroll-contain-x">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">
                    Profile Settings
                </h2>
                <p className="text-theme-secondary text-sm">
                    Manage your personal profile and preferences
                </p>
            </div>

            {/* Profile Picture Section */}
            <div className="glass-subtle rounded-xl shadow-medium border border-theme p-6 @container">
                <h3 className="text-lg font-semibold text-theme-primary mb-8 flex items-center gap-2">
                    <UserCircle size={20} />
                    Profile Picture
                </h3>

                <div className="flex items-center gap-6 pt-2">
                    {/* Picture Display */}
                    <div className="relative">
                        {profilePicture ? (
                            <div className="relative">
                                <img
                                    src={profilePicture}
                                    alt="Profile"
                                    className="w-24 h-24 min-w-[80px] min-h-[80px] max-w-[120px] max-h-[120px] aspect-square rounded-full object-cover border-2 border-theme"
                                />
                                {!confirmRemovePicture ? (
                                    <button
                                        onClick={() => setConfirmRemovePicture(true)}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-error hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                                        title="Remove picture"
                                    >
                                        <X size={14} />
                                    </button>
                                ) : (
                                    <div className="absolute -top-3 -right-3 flex gap-1">
                                        <button
                                            onClick={handleRemoveProfilePicture}
                                            className="w-7 h-7 bg-error hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors"
                                            title="Confirm remove"
                                        >
                                            ✓
                                        </button>
                                        <button
                                            onClick={() => setConfirmRemovePicture(false)}
                                            className="w-7 h-7 bg-theme-tertiary hover:bg-theme-secondary border border-theme rounded-full flex items-center justify-center text-theme-primary text-xs font-bold transition-colors"
                                            title="Cancel"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
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
                            <span className="profile-btn-text">
                                {uploadingPicture ? 'Uploading...' : (profilePicture ? 'Change' : 'Upload')}
                            </span>
                        </Button>
                        <p className="hidden sm:block text-xs text-theme-tertiary mt-2">
                            JPG, PNG, GIF or WebP. Max 5MB.
                        </p>
                    </div>
                </div>
            </div>

            {/* User Information Section */}
            <div className="glass-subtle rounded-xl shadow-medium border border-theme p-6">
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
                        <p className="text-xs text-theme-tertiary mt-1">Username cannot be changed</p>
                    </div>

                    {/* Display Name (editable) */}
                    <div>
                        <Input
                            label="Display Name"
                            value={displayName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                            placeholder={username}
                            helperText="This name is shown in greetings and throughout the app"
                        />
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

                    {/* Save Button */}
                    <Button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        icon={Save}
                    >
                        {savingProfile ? 'Saving...' : 'Save Profile'}
                    </Button>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="glass-subtle rounded-xl shadow-medium border border-theme p-6">
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
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                        required
                    />

                    <Input
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        helperText="At least 6 characters"
                    />

                    <Input
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
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
