// ======== Google Analytics 4 Event Tracking ========
// Tracks key user events for admin visibility

declare global {
    interface Window {
        gtag: (...args: any[]) => void;
        dataLayer: any[];
    }
}

/**
 * Track a custom event in GA4
 */
const trackEvent = (eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, params);
    }
};

// ======== User Events ========

/** User registered a new account */
export const trackRegister = (method: string = 'email') => {
    trackEvent('sign_up', { method });
};

/** User logged in */
export const trackLogin = (method: string = 'email') => {
    trackEvent('login', { method });
};

/** User logged out */
export const trackLogout = () => {
    trackEvent('logout');
};

// ======== Generation Events ========

/** User started image generation */
export const trackGeneration = (params: {
    resolution: string;
    aspectRatio: string;
    templateName: string;
    keyType: 'custom' | 'builtin';
    userType: 'guest' | 'free' | 'basic' | 'pro' | 'enterprise';
}) => {
    trackEvent('generate_image', {
        resolution: params.resolution,
        aspect_ratio: params.aspectRatio,
        template: params.templateName,
        key_type: params.keyType,
        user_type: params.userType,
    });
};

/** Image generation succeeded */
export const trackGenerationSuccess = (durationMs: number) => {
    trackEvent('generation_success', {
        duration_ms: durationMs,
    });
};

/** Image generation failed */
export const trackGenerationError = (errorMessage: string) => {
    trackEvent('generation_error', {
        error_message: errorMessage.substring(0, 100),
    });
};

// ======== Edit Events ========

/** User edited an image */
export const trackImageEdit = () => {
    trackEvent('edit_image');
};

// ======== API Key Events ========

/** User configured a custom API key */
export const trackApiKeySet = () => {
    trackEvent('api_key_set');
};

/** User reverted to built-in key */
export const trackApiKeyCleared = () => {
    trackEvent('api_key_cleared');
};

// ======== Pricing Events ========

/** User viewed pricing modal */
export const trackPricingView = () => {
    trackEvent('view_pricing');
};

/** User selected a plan */
export const trackPlanSelect = (planId: string, price: number) => {
    trackEvent('select_plan', {
        plan_id: planId,
        price: price,
        currency: 'CNY',
    });
};

// ======== Download Events ========

/** User downloaded a generated image */
export const trackDownload = () => {
    trackEvent('download_image');
};

// ======== Page View (for SPA) ========

/** Track virtual page view in SPA */
export const trackPageView = (pagePath: string, pageTitle: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', getGAId(), {
            page_path: pagePath,
            page_title: pageTitle,
        });
    }
};

/** Get GA measurement ID from meta tag */
const getGAId = (): string => {
    const meta = document.querySelector('meta[name="ga-id"]');
    return meta?.getAttribute('content') || '';
};
