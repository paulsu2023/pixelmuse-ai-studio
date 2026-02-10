import React, { useState } from 'react';
import { login, register } from '../services/authService';
import { trackRegister } from '../services/analytics';
import { User } from '../types';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: User) => void;
    initialMode?: 'login' | 'register';
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess, initialMode = 'login' }) => {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (mode === 'login') {
                if (!email || !password) {
                    setError('请填写邮箱和密码');
                    setIsLoading(false);
                    return;
                }
                const user = login(email, password);
                onSuccess(user);
                onClose();
            } else {
                if (!email || !password || !displayName) {
                    setError('请填写所有字段');
                    setIsLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setError('密码至少 6 位');
                    setIsLoading(false);
                    return;
                }
                const user = register(email, password, displayName);
                trackRegister();
                onSuccess(user);
                onClose();
            }
        } catch (err: any) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{ background: 'linear-gradient(135deg, rgba(232, 160, 191, 0.2), rgba(186, 144, 198, 0.15))', border: '1px solid rgba(232, 160, 191, 0.2)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {mode === 'login' ? '欢迎回来' : '加入 PixelMuse'}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {mode === 'login' ? '登录您的账号继续创作' : '注册账号，开启 AI 写真之旅'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <div>
                            <label className="section-label">昵称</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="请输入您的昵称"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label className="section-label">邮箱</label>
                        <input
                            type="email"
                            className="input-field"
                            placeholder="请输入邮箱地址"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="section-label">密码</label>
                        <input
                            type="password"
                            className="input-field"
                            placeholder={mode === 'register' ? '设置密码（至少6位）' : '请输入密码'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                        style={{ marginTop: '24px' }}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>处理中...</span>
                            </>
                        ) : (
                            <span>{mode === 'login' ? '登 录' : '注 册'}</span>
                        )}
                    </button>
                </form>

                {/* Switch Mode */}
                <div className="text-center mt-6">
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {mode === 'login' ? '还没有账号？' : '已有账号？'}
                    </span>
                    <button
                        onClick={switchMode}
                        className="text-sm font-medium ml-1 hover:underline"
                        style={{ color: 'var(--color-primary)' }}
                    >
                        {mode === 'login' ? '立即注册' : '去登录'}
                    </button>
                </div>

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
