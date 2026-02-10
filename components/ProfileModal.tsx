import React from 'react';
import { User, PricingPlan } from '../types';
import { getUserPlan, PRICING_PLANS } from '../services/authService';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onLogout: () => void;
    onUpgrade: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onLogout, onUpgrade }) => {
    if (!isOpen) return null;

    const plan = getUserPlan();
    const creditPercent = plan.credits > 0 ? Math.min((user.credits / plan.credits) * 100, 100) : 0;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
                {/* Avatar & Info */}
                <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
                        style={{ background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 4px 24px rgba(232, 160, 191, 0.3)' }}>
                        {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.displayName}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                    <span className={`badge ${plan.id === 'free' ? 'badge-free' : 'badge-pro'} mt-2 inline-block`}>
                        {plan.name}
                    </span>
                </div>

                <div className="divider mb-5"></div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="glass-card-static p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold" style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {user.credits}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>剩余次数</p>
                    </div>
                    <div className="glass-card-static p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {user.totalGenerated}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>累计生成</p>
                    </div>
                </div>

                {/* Usage Bar */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>本期用量</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.credits} / {plan.credits}</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${creditPercent}%` }}></div>
                    </div>
                </div>

                {/* Info Items */}
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-xs">
                        <span style={{ color: 'var(--text-muted)' }}>注册日期</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{formatDate(user.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span style={{ color: 'var(--text-muted)' }}>最高分辨率</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{plan.maxResolution}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span style={{ color: 'var(--text-muted)' }}>编辑功能</span>
                        <span style={{ color: plan.editEnabled ? '#86efac' : 'var(--text-muted)' }}>
                            {plan.editEnabled ? '已开通' : '未开通'}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {plan.id !== 'enterprise' && (
                        <button onClick={onUpgrade} className="btn-primary w-full">
                            升级方案
                        </button>
                    )}
                    <button
                        onClick={() => { onLogout(); onClose(); }}
                        className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}
                    >
                        退出登录
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
