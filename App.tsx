import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ImageUploader } from './components/ImageUploader';
import { ImageViewer } from './components/ImageViewer';
import { LoginModal } from './components/LoginModal';
import { PricingModal } from './components/PricingModal';
import { ProfileModal } from './components/ProfileModal';
import { ApiKeySettings } from './components/ApiKeySettings';
import { UploadedImage, AspectRatio, Resolution, GenerationSettings, User, AuthState } from './types';
import {
    GIANT_TEMPLATE_PROMPT, BATHROOM_TEMPLATE_PROMPT, STUDENT_TEMPLATE_PROMPT,
    SUBWAY_TEMPLATE_PROMPT, BEACH_SELFIE_TEMPLATE_PROMPT, SNOW_TEMPLATE_PROMPT,
    EMERALD_GODDESS_TEMPLATE_PROMPT, MINI_SEWING_TEMPLATE_PROMPT, BEACH_ROCKS_TEMPLATE_PROMPT,
    TOURIST_CHECKIN_TEMPLATE_PROMPT, PHONE_DANCE_TEMPLATE_PROMPT, RUNWAY_BUTTERFLY_TEMPLATE_PROMPT,
    MOUNTAIN_SKI_TEMPLATE_PROMPT, ASPECT_RATIOS, RESOLUTIONS
} from './constants';
import { analyzeAndCreatePrompt, generateImage, editImage, isUsingCustomKey, hasAnyApiKey } from './services/geminiService';
import {
    getCurrentUser, logout as authLogout, consumeCredit, getUserPlan,
    canUseResolution, canUseEdit, getMaxUploads, canUseTemplate,
    getGuestRemaining, consumeGuestCredit
} from './services/authService';

// Template map
const TEMPLATE_MAP: Record<string, string> = {
    giant: GIANT_TEMPLATE_PROMPT,
    bathroom: BATHROOM_TEMPLATE_PROMPT,
    student: STUDENT_TEMPLATE_PROMPT,
    subway: SUBWAY_TEMPLATE_PROMPT,
    beach: BEACH_SELFIE_TEMPLATE_PROMPT,
    snow: SNOW_TEMPLATE_PROMPT,
    emerald: EMERALD_GODDESS_TEMPLATE_PROMPT,
    sewing: MINI_SEWING_TEMPLATE_PROMPT,
    rocks: BEACH_ROCKS_TEMPLATE_PROMPT,
    tourist: TOURIST_CHECKIN_TEMPLATE_PROMPT,
    phone: PHONE_DANCE_TEMPLATE_PROMPT,
    butterfly: RUNWAY_BUTTERFLY_TEMPLATE_PROMPT,
    ski: MOUNTAIN_SKI_TEMPLATE_PROMPT,
};

const TEMPLATE_LABELS: Record<string, string> = {
    giant: '巨人构图',
    bathroom: '浴室仰拍 (高真实感)',
    student: '学生沉思 (文艺风)',
    subway: '地铁少女 (涂鸦混合媒体)',
    beach: '海滩自拍 (网红风)',
    snow: '雪地美女 (8K超清)',
    emerald: '翡翠女神 (复古森系)',
    sewing: '迷你缝纫 (微缩现实)',
    rocks: '海滩礁石 (高定摄影)',
    tourist: '景点打卡 (欧式风情)',
    phone: '手机跳舞 (赛博微缩)',
    butterfly: 'T台蝴蝶 (梦幻高定)',
    ski: '山顶滑雪 (奢华运动)',
    custom: '自定义构图',
};

const App: React.FC = () => {
    // Image State
    const [userImages, setUserImages] = useState<UploadedImage[]>([]);
    const [sceneImages, setSceneImages] = useState<UploadedImage[]>([]);
    const [refImages, setRefImages] = useState<UploadedImage[]>([]);

    // Template
    const [compositionMode, setCompositionMode] = useState<string>('giant');
    const [customTemplate, setCustomTemplate] = useState('');

    // Settings
    const [settings, setSettings] = useState<GenerationSettings>({
        aspectRatio: AspectRatio.PORTRAIT,
        resolution: Resolution.R_1K,
        prompt: '',
    });

    // App State
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editPrompt, setEditPrompt] = useState('');
    const [showTemplateInfo, setShowTemplateInfo] = useState(false);
    const [guestRemaining, setGuestRemaining] = useState(getGuestRemaining());
    const [usingCustomKey, setUsingCustomKey] = useState(isUsingCustomKey());

    // Auth State
    const [auth, setAuth] = useState<AuthState>({
        isLoggedIn: false,
        user: null,
        showLoginModal: false,
        showRegisterModal: false,
        showPricingModal: false,
        showProfileModal: false,
    });

    const [showApiKeySettings, setShowApiKeySettings] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Init
    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setAuth(prev => ({ ...prev, isLoggedIn: true, user }));
        }
        setGuestRemaining(getGuestRemaining());
        setUsingCustomKey(isUsingCustomKey());
    }, []);

    // Toast auto-hide
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    const handleLoginSuccess = (user: User) => {
        setAuth(prev => ({ ...prev, isLoggedIn: true, user, showLoginModal: false, showRegisterModal: false }));
        showToast(`欢迎回来，${user.displayName}！`);
    };

    const handleLogout = () => {
        authLogout();
        setAuth({ isLoggedIn: false, user: null, showLoginModal: false, showRegisterModal: false, showPricingModal: false, showProfileModal: false });
        setGuestRemaining(getGuestRemaining()); // Refresh guest limit on logout
        showToast('已退出登录');
    };

    const refreshUser = () => {
        const user = getCurrentUser();
        if (user) {
            setAuth(prev => ({ ...prev, user }));
        } else {
            setGuestRemaining(getGuestRemaining());
        }
    };

    const handleGenerate = async () => {
        // 1. Check Technical Prerequisites
        if (!hasAnyApiKey()) {
            setShowApiKeySettings(true);
            showToast('请先配置 API Key', 'error');
            return;
        }

        // 2. Check Quota / Auth Logic
        // Priority: Custom API Key > Logged In User > Guest
        if (usingCustomKey) {
            // Custom key: Unlimited, no credit check needed
        } else if (auth.isLoggedIn) {
            // Logged in: Check user credits
            if (auth.user && auth.user.credits <= 0) {
                showToast('生成次数已用完，请升级方案', 'error');
                setAuth(prev => ({ ...prev, showPricingModal: true }));
                return;
            }
        } else {
            // Guest: Check daily limit
            if (getGuestRemaining() <= 0) {
                showToast('今日免费体验次数已用完，请登录或配置 API Key', 'error');
                setAuth(prev => ({ ...prev, showLoginModal: true }));
                return;
            }
        }

        // 3. Check Feature Permissions (only if NOT using custom key)
        // If using custom key, we unlock all features primarily, or keep stricter UI limits?
        // Let's stick to UI limits based on login status to encourage login, 
        // BUT allows all resolutions/templates if custom key is present to be nice.
        if (!usingCustomKey) {
            if (!canUseResolution(settings.resolution)) {
                showToast('当前方案不支持该分辨率，请升级或使用自定义 Key', 'error');
                if (auth.isLoggedIn) setAuth(prev => ({ ...prev, showPricingModal: true }));
                return;
            }

            if (!canUseTemplate(compositionMode)) {
                showToast('当前方案不支持该模板，请升级或使用自定义 Key', 'error');
                if (auth.isLoggedIn) setAuth(prev => ({ ...prev, showPricingModal: true }));
                return;
            }
        }

        // 4. Input Validation
        const baseTemplate = compositionMode === 'custom' ? customTemplate : (TEMPLATE_MAP[compositionMode] || '');
        if (refImages.length === 0 && !baseTemplate.trim()) {
            setStatusMessage('请输入自定义构图提示词，或上传风格参考图。');
            setIsGenerating(false);
            return;
        }

        setIsGenerating(true);
        setEditMode(false);

        // Status message
        if (refImages.length > 0) {
            setStatusMessage('✨ AI 正在根据【风格参考图】进行深度结构分析...');
        } else {
            const label = TEMPLATE_LABELS[compositionMode] || '自定义';
            setStatusMessage(`✨ AI 正在根据「${label}」模板分析构图...`);
        }

        try {
            const fusedPrompt = await analyzeAndCreatePrompt(
                userImages.map(i => i.base64),
                sceneImages.map(i => i.base64),
                refImages.map(i => i.base64),
                settings.prompt,
                baseTemplate,
                compositionMode === 'giant'
            );

            setStatusMessage('🎨 正在生成高精度图像 (Gemini 3 Pro)...');

            const references = {
                user: userImages.length > 0 ? userImages[0].base64 : undefined,
                scene: sceneImages.length > 0 ? sceneImages[0].base64 : undefined,
                style: refImages.length > 0 ? refImages[0].base64 : undefined,
            };

            const resultImage = await generateImage(fusedPrompt, settings.resolution, settings.aspectRatio, references);

            // 5. Deduct Credits (only if NOT custom key)
            if (!usingCustomKey) {
                if (auth.isLoggedIn) {
                    consumeCredit();
                } else {
                    consumeGuestCredit();
                }
                refreshUser();
            }

            setGeneratedImageUrl(resultImage);
            setHistory(prev => [resultImage, ...prev]);
            setStatusMessage('');
            showToast('生成成功！');
        } catch (error: any) {
            console.error(error);
            if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('API_KEY')) {
                setStatusMessage('API Key 无效或权限不足');
                setShowApiKeySettings(true);
            } else {
                setStatusMessage(`生成失败: ${error.message || '未知错误'}`);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEdit = async () => {
        if (!generatedImageUrl || !editPrompt) return;

        // Permission check
        if (!usingCustomKey) {
            if (!process.env.editEnabled && !auth.isLoggedIn && !canUseEdit()) {
                // Guest logic for edit? Maybe disable edit for guests
                showToast('编辑功能需登录使用', 'error');
                setAuth(prev => ({ ...prev, showLoginModal: true }));
                return;
            }
            if (auth.isLoggedIn && !canUseEdit()) {
                showToast('编辑功能需升级到轻享版或以上', 'error');
                setAuth(prev => ({ ...prev, showPricingModal: true }));
                return;
            }
        }

        setIsGenerating(true);
        setStatusMessage('✨ AI 正在根据您的指令修改图片...');

        try {
            const resultImage = await editImage(generatedImageUrl, editPrompt, settings.aspectRatio);

            // Deduct for edit?
            // Simple logic: Edit is free for custom key, costs 1 credit for users
            if (!usingCustomKey && auth.isLoggedIn) {
                consumeCredit();
                refreshUser();
            }

            setGeneratedImageUrl(resultImage);
            setHistory(prev => [resultImage, ...prev]);
            setEditPrompt('');
            setEditMode(false);
            setStatusMessage('');
            showToast('修改成功！');
        } catch (error: any) {
            console.error(error);
            setStatusMessage(`修改失败: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadImage = (url: string) => {
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.download = `pixelmuse-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const maxUploads = (auth.isLoggedIn || usingCustomKey) ? getMaxUploads() : 1;

    // Determine button state text
    const getButtonText = () => {
        if (isGenerating) return '生成中...';
        if (usingCustomKey) return '开始生成 (自定义Key)';
        if (auth.isLoggedIn) return `开始生成 (消耗 1 点)`;
        return `免费生成 (今日剩余 ${guestRemaining} 次)`;
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row font-sans noise-overlay" style={{ background: 'var(--surface-dark)' }}>

            {/* ===== Sidebar ===== */}
            <aside className="sidebar">
                {/* Logo & Header */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--gradient-brand)', boxShadow: '0 4px 16px rgba(232, 160, 191, 0.3)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold logo-glow" style={{ color: 'var(--color-primary)' }}>
                                PixelMuse
                            </h1>
                            <p className="text-[9px] font-medium tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                                AI 智能写真工作室
                            </p>
                        </div>
                    </div>

                    {auth.isLoggedIn && auth.user ? (
                        <button
                            onClick={() => setAuth(prev => ({ ...prev, showProfileModal: true }))}
                            className="avatar"
                            title={auth.user.displayName}
                        >
                            {auth.user.displayName.charAt(0).toUpperCase()}
                        </button>
                    ) : (
                        <button
                            onClick={() => setAuth(prev => ({ ...prev, showLoginModal: true }))}
                            className="btn-secondary text-xs px-3 py-1.5"
                        >
                            登录
                        </button>
                    )}
                </div>

                {/* Status / Credits Bar */}
                {auth.isLoggedIn && auth.user && !usingCustomKey && (
                    <div className="glass-card-static p-3 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`badge ${auth.user.plan === 'free' ? 'badge-free' : 'badge-pro'}`}>
                                    {getUserPlan().name}
                                </span>
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                    剩余 {auth.user.credits} 次
                                </span>
                            </div>
                            <button
                                onClick={() => setAuth(prev => ({ ...prev, showPricingModal: true }))}
                                className="text-[10px] font-medium hover:underline"
                                style={{ color: 'var(--color-primary)' }}
                            >
                                升级
                            </button>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.min((auth.user.credits / getUserPlan().credits) * 100, 100)}%` }}></div>
                        </div>
                    </div>
                )}

                {/* API Key Status Bar (Shows if using custom key or guest) */}
                <div
                    onClick={() => setShowApiKeySettings(true)}
                    className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5 border border-transparent hover:border-white/10"
                >
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${usingCustomKey ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>
                        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            {usingCustomKey ? '已有私有 API Key' : '使用平台内置 API'}
                        </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </div>

                <div className="divider"></div>

                {/* Image Uploaders */}
                <div className="space-y-3">
                    <ImageUploader
                        title="主体 / 人物"
                        subtitle="上传人物照片，AI 将提取身份特征"
                        images={userImages}
                        setImages={setUserImages}
                        maxImages={maxUploads}
                        onZoom={(img) => setViewingImage(img.previewUrl)}
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        }
                    />
                    <ImageUploader
                        title="背景 / 场景"
                        subtitle="上传场景图，AI 将融合光照与环境"
                        images={sceneImages}
                        setImages={setSceneImages}
                        maxImages={maxUploads}
                        onZoom={(img) => setViewingImage(img.previewUrl)}
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                        }
                    />
                    <ImageUploader
                        title="风格参考图"
                        subtitle="上传参考图，AI 将复制构图与风格"
                        images={refImages}
                        setImages={setRefImages}
                        maxImages={maxUploads}
                        onZoom={(img) => setViewingImage(img.previewUrl)}
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"></path>
                            </svg>
                        }
                    />
                </div>

                {/* Template Selection */}
                <div className={`glass-card p-4 transition-opacity ${refImages.length > 0 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                    <p className="section-label">构图 / 风格模板</p>
                    <select
                        value={compositionMode}
                        onChange={(e) => setCompositionMode(e.target.value)}
                        className="select-field"
                    >
                        {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}{!usingCustomKey && !canUseTemplate(key) ? ' 🔒' : ''}
                            </option>
                        ))}
                    </select>

                    {compositionMode === 'custom' && (
                        <textarea
                            value={customTemplate}
                            onChange={(e) => setCustomTemplate(e.target.value)}
                            placeholder="请输入描述画面构图、人物动作、场景关系的提示词..."
                            className="input-field mt-3 h-24 resize-none text-xs"
                        />
                    )}
                </div>

                {/* Configuration */}
                <div className="space-y-4">
                    <div>
                        <p className="section-label">画幅比例</p>
                        <div className="grid grid-cols-3 gap-2">
                            {ASPECT_RATIOS.map(ar => (
                                <button
                                    key={ar.value}
                                    onClick={() => setSettings(s => ({ ...s, aspectRatio: ar.value }))}
                                    className={`chip ${settings.aspectRatio === ar.value ? 'active' : ''}`}
                                >
                                    {ar.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="section-label">分辨率</p>
                        <div className="grid grid-cols-3 gap-2">
                            {RESOLUTIONS.map(res => (
                                <button
                                    key={res.value}
                                    onClick={() => {
                                        if (!usingCustomKey && !canUseResolution(res.value)) {
                                            showToast('该分辨率需要升级方案或使用自定义 Key', 'error');
                                            return;
                                        }
                                        setSettings(s => ({ ...s, resolution: res.value }));
                                    }}
                                    className={`chip ${settings.resolution === res.value ? 'active' : ''} ${!usingCustomKey && !canUseResolution(res.value) ? 'opacity-40' : ''}`}
                                >
                                    {res.label}
                                    {!usingCustomKey && !canUseResolution(res.value) && ' 🔒'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            {/* ===== Main Content ===== */}
            <main className="main-content">
                {/* Top Prompt Bar */}
                <div className="p-6" style={{ background: 'var(--gradient-surface)', borderBottom: '1px solid rgba(232, 160, 191, 0.06)' }}>
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            额外指令 <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(可选)</span>
                        </label>
                        <button
                            onClick={() => setShowTemplateInfo(!showTemplateInfo)}
                            className="text-[11px] font-medium hover:underline"
                            style={{ color: 'var(--color-primary)', opacity: 0.7 }}
                        >
                            {showTemplateInfo ? '隐藏说明' : '查看工作原理'}
                        </button>
                    </div>

                    {showTemplateInfo && (
                        <div className="mb-3 p-4 rounded-xl text-xs leading-relaxed animate-fade-in-up"
                            style={{ background: 'rgba(232, 160, 191, 0.05)', border: '1px solid rgba(232, 160, 191, 0.1)', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: 'var(--color-primary)' }}>工作原理：</strong><br />
                            1. <strong>风格参考图：</strong>若上传，则作为构图和样式的绝对基准，忽略文本模板。<br />
                            2. <strong>图像注入：</strong>"主体"和"场景"将替换参考图中的对应部分。<br />
                            3. <strong>额外指令：</strong>您在此输入的指令（如"改成晚上"）始终生效。
                        </div>
                    )}

                    <textarea
                        value={settings.prompt}
                        onChange={(e) => setSettings(s => ({ ...s, prompt: e.target.value }))}
                        className="input-field h-28 resize-none text-sm leading-relaxed"
                        placeholder="在此输入额外的描述或指令（例如：'让她微笑'，'改为夜晚场景'，'增加梦幻光效'）"
                    />

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`btn-primary w-full mt-4 flex items-center justify-center gap-2.5 text-base ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>生成中...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"></path>
                                </svg>
                                <span>{getButtonText()}</span>
                            </>
                        )}
                    </button>

                    {statusMessage && (
                        <div className="mt-3 text-center text-sm status-pulse" style={{ color: 'var(--color-primary)' }}>
                            {statusMessage}
                        </div>
                    )}
                </div>

                {/* Result Area */}
                <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-hidden relative"
                    style={{ background: 'radial-gradient(ellipse at center, rgba(232, 160, 191, 0.03) 0%, transparent 70%)' }}>
                    {generatedImageUrl ? (
                        <div className="relative w-full h-full flex flex-col items-center animate-fade-in">
                            {/* Image */}
                            <div className="flex-1 flex items-center justify-center w-full min-h-0">
                                <img
                                    src={generatedImageUrl}
                                    alt="生成结果"
                                    className="max-h-full max-w-full object-contain rounded-2xl cursor-zoom-in"
                                    style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 0 40px rgba(232, 160, 191, 0.06)' }}
                                    onClick={() => setViewingImage(generatedImageUrl)}
                                />
                            </div>

                            {/* Action Bar */}
                            <div className="mt-4 flex gap-2 p-2 rounded-2xl glass-card-static"
                                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                                <button onClick={() => setViewingImage(generatedImageUrl)} className="btn-icon" title="放大预览">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        <line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line>
                                    </svg>
                                </button>
                                <button onClick={() => generatedImageUrl && downloadImage(generatedImageUrl)} className="btn-icon" title="下载图片">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className={`btn-icon ${editMode ? 'active' : ''}`}
                                    title="修改图片"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9"></path>
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                    </svg>
                                </button>
                                <button onClick={handleGenerate} className="btn-icon" title="重新生成">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                </button>
                            </div>

                            {/* History Strip */}
                            {history.length > 1 && (
                                <div className="absolute bottom-4 left-4 right-4 h-16 glass-card-static p-2 flex gap-2 overflow-x-auto">
                                    {history.map((url, idx) => (
                                        <img
                                            key={idx}
                                            src={url}
                                            alt={`历史 ${idx + 1}`}
                                            onClick={() => setGeneratedImageUrl(url)}
                                            className={`h-full w-auto rounded-lg cursor-pointer transition-all border-2 ${generatedImageUrl === url ? 'border-pink-400 scale-105' : 'border-transparent hover:border-pink-400/30'}`}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Edit Panel */}
                            {editMode && (
                                <div className="absolute bottom-24 w-96 glass-card-static p-5 rounded-2xl animate-fade-in-up z-20"
                                    style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
                                    <label className="section-label">修改指令</label>
                                    <div className="flex gap-2 mt-1">
                                        <input
                                            type="text"
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                                            className="input-field flex-1 text-sm"
                                            placeholder="例如：加上一副墨镜、改为夜景..."
                                        />
                                        <button onClick={handleEdit} className="btn-primary px-5 py-2 text-sm">
                                            确认
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="text-center animate-float">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, rgba(232, 160, 191, 0.1), rgba(186, 144, 198, 0.08))', border: '1px solid rgba(232, 160, 191, 0.12)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)', opacity: 0.4 }}>
                                    <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"></path>
                                </svg>
                            </div>
                            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>等待创作</p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {auth.isLoggedIn
                                    ? '上传照片，选择风格，开启您的 AI 写真之旅'
                                    : `今日剩余免费体验 ${guestRemaining} 次，或配置自己的 Key 无限生成`
                                }
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* ===== Modals ===== */}
            <ImageViewer url={viewingImage} onClose={() => setViewingImage(null)} />

            <LoginModal
                isOpen={auth.showLoginModal}
                onClose={() => setAuth(prev => ({ ...prev, showLoginModal: false }))}
                onSuccess={handleLoginSuccess}
            />

            <PricingModal
                isOpen={auth.showPricingModal}
                onClose={() => setAuth(prev => ({ ...prev, showPricingModal: false }))}
                currentPlan={auth.user?.plan}
                onSelectPlan={(plan) => {
                    if (!auth.isLoggedIn) {
                        setAuth(prev => ({ ...prev, showPricingModal: false, showLoginModal: true }));
                        return;
                    }
                    showToast('升级功能 (演示)，请联系管理员');
                    setAuth(prev => ({ ...prev, showPricingModal: false }));
                }}
            />

            {auth.user && (
                <ProfileModal
                    isOpen={auth.showProfileModal}
                    onClose={() => setAuth(prev => ({ ...prev, showProfileModal: false }))}
                    user={auth.user}
                    onLogout={handleLogout}
                    onUpgrade={() => {
                        setAuth(prev => ({ ...prev, showProfileModal: false, showPricingModal: true }));
                    }}
                />
            )}

            <ApiKeySettings
                isOpen={showApiKeySettings}
                onClose={() => setShowApiKeySettings(false)}
                onKeyChanged={() => {
                    setUsingCustomKey(isUsingCustomKey());
                    setShowApiKeySettings(false);
                    showToast(isUsingCustomKey() ? '已切换到自定义 API Key' : '已恢复默认设置');
                }}
            />

            {/* ===== Toast ===== */}
            {toast && (
                <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
