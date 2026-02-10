import React from 'react';
import { PricingPlan } from '../types';
import { PRICING_PLANS } from '../services/authService';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan?: string;
    onSelectPlan?: (plan: PricingPlan) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, currentPlan = 'free', onSelectPlan }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-5xl p-8" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="text-center mb-10">
                    <span className="badge badge-pro mb-3 inline-block text-xs px-3 py-1">升级计划</span>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        选择适合您的方案
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        解锁更多高级功能，让您的 AI 写真创作更上一层楼
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {PRICING_PLANS.map((plan) => (
                        <div
                            key={plan.id}
                            className={`pricing-card ${plan.highlighted ? 'featured' : ''}`}
                        >
                            <div className="relative z-10">
                                {/* Plan Name */}
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {plan.name}
                                    </h3>
                                    {plan.badge && (
                                        <span className={`badge ${plan.id === 'free' ? 'badge-free' : 'badge-pro'}`}>
                                            {plan.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>{plan.nameEn}</p>

                                {/* Price */}
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        {plan.price > 0 && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>¥</span>}
                                        <span className="text-3xl font-bold" style={{
                                            background: plan.highlighted ? 'var(--gradient-brand)' : 'none',
                                            WebkitBackgroundClip: plan.highlighted ? 'text' : 'unset',
                                            WebkitTextFillColor: plan.highlighted ? 'transparent' : 'var(--text-primary)',
                                            color: plan.highlighted ? 'unset' : 'var(--text-primary)'
                                        }}>
                                            {plan.price === 0 ? '免费' : plan.price}
                                        </span>
                                        {plan.price > 0 && (
                                            <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>/ {plan.period}</span>
                                        )}
                                    </div>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                        {plan.price === 0 ? `注册赠送 ${plan.credits} 次 · 游客每日 2 次` : `${plan.credits} 次生成 / ${plan.period}`}
                                    </p>
                                </div>

                                {/* Features */}
                                <ul className="space-y-2.5 mb-6">
                                    {plan.features.map((feat, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }}>
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                            <span>{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <button
                                    onClick={() => onSelectPlan?.(plan)}
                                    disabled={currentPlan === plan.id}
                                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${currentPlan === plan.id
                                        ? 'opacity-50 cursor-not-allowed'
                                        : plan.highlighted
                                            ? 'btn-primary'
                                            : 'btn-secondary'
                                        }`}
                                    style={currentPlan === plan.id ? {
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid rgba(255,255,255,0.08)'
                                    } : {}}
                                >
                                    {currentPlan === plan.id ? '当前方案' : plan.price === 0 ? '免费使用' : '立即升级'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="text-center mt-8 space-y-1">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        所有方案均支持随时升级或降级 · 7天无理由退款
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                        价格为人民币，按月订阅 · 企业定制方案请联系客服
                    </p>
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
