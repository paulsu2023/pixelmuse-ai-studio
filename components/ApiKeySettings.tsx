import React, { useState, useEffect } from 'react';
import { validateApiKey, getCustomApiKey, saveCustomApiKey, clearCustomApiKey, isUsingCustomKey } from '../services/geminiService';

interface ApiKeySettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onKeyChanged: () => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ isOpen, onClose, onKeyChanged }) => {
    const [apiKey, setApiKey] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
    const [usingCustom, setUsingCustom] = useState(false);
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const customKey = getCustomApiKey();
            setApiKey(customKey);
            setUsingCustom(isUsingCustomKey());
            setValidationResult(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleValidate = async () => {
        if (!apiKey.trim()) {
            setValidationResult({ valid: false, message: '请输入 API Key' });
            return;
        }

        setIsValidating(true);
        setValidationResult(null);

        try {
            const result = await validateApiKey(apiKey.trim());
            setValidationResult(result);

            if (result.valid) {
                saveCustomApiKey(apiKey.trim());
                setUsingCustom(true);
                onKeyChanged();
            }
        } catch (err: any) {
            setValidationResult({ valid: false, message: `验证出错: ${err.message}` });
        } finally {
            setIsValidating(false);
        }
    };

    const handleClear = () => {
        clearCustomApiKey();
        setApiKey('');
        setUsingCustom(false);
        setValidationResult(null);
        onKeyChanged();
    };

    const maskedKey = (key: string) => {
        if (!key) return '';
        if (key.length <= 8) return '••••••••';
        return key.substring(0, 6) + '••••••••••••' + key.substring(key.length - 4);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(232, 160, 191, 0.2), rgba(186, 144, 198, 0.15))', border: '1px solid rgba(232, 160, 191, 0.2)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>API Key 设置</h2>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>使用自己的 Google AI API Key 享受无限制生成</p>
                    </div>
                </div>

                {/* Current Status */}
                <div className="glass-card-static p-4 rounded-xl mb-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${usingCustom ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                style={{ boxShadow: usingCustom ? '0 0 8px rgba(52, 211, 153, 0.5)' : '0 0 8px rgba(251, 191, 36, 0.5)' }}></div>
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {usingCustom ? '正在使用您的自定义 Key' : '正在使用平台内置 Key'}
                            </span>
                        </div>
                        {usingCustom && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#6ee7b7', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                自定义
                            </span>
                        )}
                    </div>
                    {usingCustom && (
                        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                            Key: {maskedKey(apiKey)}
                        </p>
                    )}
                </div>

                {/* Info Banner */}
                <div className="p-4 rounded-xl mb-5 text-xs leading-relaxed"
                    style={{ background: 'rgba(232, 160, 191, 0.05)', border: '1px solid rgba(232, 160, 191, 0.1)', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--color-primary)' }}>💡 使用自己的 Key 的好处：</strong>
                    <ul className="mt-2 space-y-1 ml-4" style={{ listStyleType: 'disc' }}>
                        <li>不消耗平台生成次数</li>
                        <li>不受平台限速影响</li>
                        <li>按 Google 官方价格计费</li>
                        <li>数据直连 Google，更安全</li>
                    </ul>
                </div>

                {/* Input */}
                <div className="mb-4">
                    <label className="section-label">Google AI API Key</label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            className="input-field pr-20"
                            placeholder="输入您的 API Key（以 AIza 开头）"
                            value={apiKey}
                            onChange={e => { setApiKey(e.target.value); setValidationResult(null); }}
                        />
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium px-2 py-1 rounded-md transition-all"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                        >
                            {showKey ? '隐藏' : '显示'}
                        </button>
                    </div>
                </div>

                {/* Validation Result */}
                {validationResult && (
                    <div className={`p-3 rounded-xl mb-4 text-sm flex items-center gap-2 animate-fade-in`}
                        style={{
                            background: validationResult.valid ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${validationResult.valid ? 'rgba(52, 211, 153, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                            color: validationResult.valid ? '#6ee7b7' : '#fca5a5'
                        }}>
                        {validationResult.valid ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        )}
                        <span className="text-xs">{validationResult.message}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleValidate}
                        disabled={isValidating || !apiKey.trim()}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        {isValidating ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>验证中...</span>
                            </>
                        ) : (
                            <span>验证并保存</span>
                        )}
                    </button>

                    {usingCustom && (
                        <button onClick={handleClear} className="btn-secondary">
                            恢复内置
                        </button>
                    )}
                </div>

                {/* Help Link */}
                <div className="mt-5 text-center">
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                        className="text-[11px] hover:underline inline-flex items-center gap-1"
                        style={{ color: 'var(--color-primary)', opacity: 0.7 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        如何获取 Google AI API Key？
                    </a>
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
