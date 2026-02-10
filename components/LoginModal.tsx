import React, { useState } from 'react';
import { login, register } from '../services/authService';
import { trackLogin, trackRegister } from '../services/analytics';
import { User } from '../types';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        // Simulate Google Login delay
        setTimeout(() => {
            // Mock a Google user
            const mockEmail = `google_user_${Date.now().toString().slice(-4)}@gmail.com`;
            const mockName = 'Google 用户';

            // Try to "login" or "register" this mock user
            // In a real app, this would use the ID token from Google
            try {
                // For simplicity in this mock version, we just create a new session
                // In reality, we'd check if email exists.
                // Let's just use a fixed mock email for "demo" purposes or random?
                // Use random to simulate different users
                const user = register(mockEmail, 'google-mock-pass', mockName);
                trackRegister(); // Track as new user
                trackLogin();
                onSuccess(user);
                onClose();
            } catch (e) {
                // If already registered (collision), try login
                try {
                    const user = login(mockEmail, 'google-mock-pass');
                    trackLogin();
                    onSuccess(user);
                    onClose();
                } catch (err) {
                    console.error(err);
                }
            }
            setIsLoading(false);
        }, 800);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-white shadow-lg">
                        <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        登录 PixelMuse
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        登录后可保留生成记录
                    </p>
                </div>

                {/* Google Button */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 font-medium py-3 px-4 rounded-xl transition-all hover:shadow-md"
                >
                    {isLoading ? (
                        <span className="text-sm">正在登录...</span>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>使用 Google 账号登录</span>
                        </>
                    )}
                </button>

                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};
