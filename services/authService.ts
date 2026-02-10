import { User, PlanType, GenerationRecord, PricingPlan, Resolution } from '../types';

// LocalStorage keys
const STORAGE_KEYS = {
    USER: 'pixelmuse_user',
    RECORDS: 'pixelmuse_records',
    TOKEN: 'pixelmuse_token',
    GUEST_USAGE: 'pixelmuse_guest_usage',
};

// ======== Cost Analysis (Gemini 3 Pro Image / Banana Pro) ========
// API Cost per image:
//   1K-2K resolution: $0.134 (~¥1.00)
//   4K resolution:    $0.24  (~¥1.80)
// Pricing Strategy: ~2x cost markup
//   Basic (2K): Cost ¥60 -> Price ¥128
//   Pro (4K): Cost ¥180 (mixed) -> Price ¥398 (Conservative 2.2x)
//   Enterprise (4K): Cost ¥720 -> Price ¥1598 (2.2x)

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'free',
        name: '体验版',
        nameEn: 'Free',
        price: 0,
        period: '永久免费',
        credits: 5,       // One-time bonus for registered users
        features: [
            '注册赠送 5 次生成',
            '未注册用户每日 2 次免费',
            '标准 1K 分辨率',
            '3 个基础构图模板',
            '单张图片上传',
            '含平台水印',
        ],
        maxResolution: Resolution.R_1K,
        maxUploads: 1,
        editEnabled: false,
        priorityQueue: false,
        badge: '免费',
    },
    {
        id: 'basic',
        name: '轻享版',
        nameEn: 'Basic',
        price: 128,
        period: '月',
        credits: 60,
        features: [
            '每月 60 次生成',
            '高清 2K 分辨率',
            '全部 13 个构图模板',
            '最多 2 张图片上传',
            '图片编辑功能',
            '作品永久保存',
            '专属水印去除',
        ],
        maxResolution: Resolution.R_2K,
        maxUploads: 2,
        editEnabled: true,
        priorityQueue: false,
    },
    {
        id: 'pro',
        name: '专业版',
        nameEn: 'Pro',
        price: 398,
        period: '月',
        credits: 100,
        features: [
            '每月 100 次生成',
            '超清 4K 分辨率',
            '全部模板 + 自定义构图',
            '最多 4 张图片上传',
            '高级图片编辑 & 修改',
            '风格参考图功能',
            '优先生成队列',
            '作品永久保存',
            'API 接口访问',
            '商用授权',
        ],
        highlighted: true,
        maxResolution: Resolution.R_4K,
        maxUploads: 4,
        editEnabled: true,
        priorityQueue: true,
        badge: '推荐',
    },
    {
        id: 'enterprise',
        name: '旗舰版',
        nameEn: 'Enterprise',
        price: 1598,
        period: '月',
        credits: 400,
        features: [
            '每月 400 次生成',
            '超清 4K 分辨率',
            '无限构图模板',
            '最多 4 张图片上传',
            '全部高级功能',
            '批量生成支持',
            '最高优先级队列',
            '1 对 1 专属客服',
            'API 无限制调用',
            '商用授权 + 独占授权',
            '定制模板开发',
        ],
        maxResolution: Resolution.R_4K,
        maxUploads: 4,
        editEnabled: true,
        priorityQueue: true,
    },
];

// ======== Guest (Unregistered) Usage ========
const GUEST_DAILY_LIMIT = 2;

interface GuestUsage {
    date: string; // YYYY-MM-DD
    count: number;
}

const getTodayStr = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const getGuestUsage = (): GuestUsage => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.GUEST_USAGE);
        if (data) {
            const usage = JSON.parse(data) as GuestUsage;
            if (usage.date === getTodayStr()) {
                return usage;
            }
        }
    } catch { }
    // Reset for new day
    return { date: getTodayStr(), count: 0 };
};

export const getGuestRemaining = (): number => {
    const usage = getGuestUsage();
    return Math.max(0, GUEST_DAILY_LIMIT - usage.count);
};

export const consumeGuestCredit = (): boolean => {
    const usage = getGuestUsage();
    if (usage.count >= GUEST_DAILY_LIMIT) return false;

    usage.count += 1;
    localStorage.setItem(STORAGE_KEYS.GUEST_USAGE, JSON.stringify(usage));
    return true;
};

// ======== Utility ========
const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const hashPassword = (password: string): string => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
};

// ======== Auth Functions ========
export const register = (email: string, password: string, displayName: string): User => {
    const existingUsers = getAllUsers();
    if (existingUsers.find(u => u.email === email)) {
        throw new Error('该邮箱已注册，请直接登录');
    }

    const user: User = {
        id: generateId(),
        email,
        displayName,
        plan: 'free',
        credits: 5, // Sign up bonus
        totalGenerated: 0,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
    };

    const users = getAllUsers();
    users.push({ ...user, passwordHash: hashPassword(password) });
    localStorage.setItem('pixelmuse_all_users', JSON.stringify(users));

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.TOKEN, generateId());

    return user;
};

export const login = (email: string, password: string): User => {
    const users = getAllUsers();
    const found = users.find(u => u.email === email && u.passwordHash === hashPassword(password));

    if (!found) {
        throw new Error('邮箱或密码错误');
    }

    const user: User = {
        id: found.id,
        email: found.email,
        displayName: found.displayName,
        avatar: found.avatar,
        plan: found.plan,
        credits: found.credits,
        totalGenerated: found.totalGenerated,
        createdAt: found.createdAt,
        lastLoginAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.TOKEN, generateId());

    return user;
};

export const logout = (): void => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
};

export const getCurrentUser = (): User | null => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return null;

    const userData = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userData) return null;

    try {
        return JSON.parse(userData) as User;
    } catch {
        return null;
    }
};

export const updateUser = (updates: Partial<User>): User | null => {
    const user = getCurrentUser();
    if (!user) return null;

    const updated = { ...user, ...updates };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));

    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates };
        localStorage.setItem('pixelmuse_all_users', JSON.stringify(users));
    }

    return updated;
};

export const consumeCredit = (): boolean => {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.credits <= 0) return false;

    updateUser({
        credits: user.credits - 1,
        totalGenerated: user.totalGenerated + 1,
    });

    return true;
};

export const getUserPlan = (): PricingPlan => {
    const user = getCurrentUser();
    const planId = user?.plan || 'free';
    return PRICING_PLANS.find(p => p.id === planId) || PRICING_PLANS[0];
};

// ======== Records ========
export const saveRecord = (record: Omit<GenerationRecord, 'id'>): GenerationRecord => {
    const records = getRecords();
    const newRecord: GenerationRecord = {
        ...record,
        id: generateId(),
    };
    records.unshift(newRecord);
    const trimmed = records.slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(trimmed));
    return newRecord;
};

export const getRecords = (): GenerationRecord[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

// ======== Internal helpers ========
const getAllUsers = (): any[] => {
    try {
        const data = localStorage.getItem('pixelmuse_all_users');
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

// ======== Plan Features Check ========
export const canUseResolution = (resolution: string): boolean => {
    const user = getCurrentUser();
    if (!user) {
        // Guest can only use 1K
        return resolution === Resolution.R_1K;
    }
    const plan = getUserPlan();
    const resOrder = [Resolution.R_1K, Resolution.R_2K, Resolution.R_4K];
    const maxIdx = resOrder.indexOf(plan.maxResolution);
    const reqIdx = resOrder.indexOf(resolution as Resolution);
    return reqIdx <= maxIdx;
};

export const canUseEdit = (): boolean => {
    const user = getCurrentUser();
    if (!user) return false;
    return getUserPlan().editEnabled;
};

export const getMaxUploads = (): number => {
    const user = getCurrentUser();
    if (!user) return 1;
    return getUserPlan().maxUploads;
};

export const canUseTemplate = (template: string): boolean => {
    const user = getCurrentUser();
    if (!user) {
        // Guest: only 3 basic templates
        return ['giant', 'bathroom', 'student'].includes(template);
    }
    const plan = getUserPlan();
    if (plan.id === 'free') {
        return ['giant', 'bathroom', 'student'].includes(template);
    }
    if (plan.id === 'basic') {
        return template !== 'custom';
    }
    return true;
};
