import { GoogleGenAI } from "@google/genai";
import { Resolution, AspectRatio } from "../types";

// ======== API Key Management ========
const CUSTOM_KEY_STORAGE = 'pixelmuse_custom_api_key';
const BUILTIN_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

/**
 * Get the active API key - user's custom key takes priority over built-in
 */
export const getActiveApiKey = (): string => {
  const customKey = localStorage.getItem(CUSTOM_KEY_STORAGE);
  if (customKey && customKey.trim()) return customKey.trim();
  return BUILTIN_KEY;
};

/**
 * Check if any API key is available (built-in or custom)
 */
export const hasAnyApiKey = (): boolean => {
  return !!getActiveApiKey();
};

/**
 * Save a custom user API key
 */
export const saveCustomApiKey = (key: string): void => {
  if (key && key.trim()) {
    localStorage.setItem(CUSTOM_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(CUSTOM_KEY_STORAGE);
  }
};

/**
 * Get the user's custom API key
 */
export const getCustomApiKey = (): string => {
  return localStorage.getItem(CUSTOM_KEY_STORAGE) || '';
};

/**
 * Remove custom API key (revert to built-in)
 */
export const clearCustomApiKey = (): void => {
  localStorage.removeItem(CUSTOM_KEY_STORAGE);
};

/**
 * Check if using custom key or built-in
 */
export const isUsingCustomKey = (): boolean => {
  const customKey = localStorage.getItem(CUSTOM_KEY_STORAGE);
  return !!(customKey && customKey.trim());
};

/**
 * Validate an API key by making a lightweight test call
 */
export const validateApiKey = async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: 'Reply with exactly: OK' }] },
      config: {
        maxOutputTokens: 5,
      }
    });
    const text = response.text || '';
    if (text) {
      return { valid: true, message: 'API Key 验证成功！' };
    }
    return { valid: false, message: '验证失败：未收到有效响应' };
  } catch (error: any) {
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid')) {
      return { valid: false, message: 'API Key 无效，请检查后重试' };
    }
    if (error.message?.includes('PERMISSION_DENIED')) {
      return { valid: false, message: 'API Key 权限不足，请确认已启用 Generative Language API' };
    }
    if (error.message?.includes('billing')) {
      return { valid: false, message: 'API Key 需要启用付费项目' };
    }
    // If we get a quota error, the key is valid but rate limited
    if (error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('quota')) {
      return { valid: true, message: 'API Key 有效（当前配额已用尽，请稍后重试）' };
    }
    return { valid: false, message: `验证失败: ${error.message?.substring(0, 100) || '未知错误'}` };
  }
};

// ======== Legacy AI Studio integration (kept for compatibility) ========
export const checkApiKey = async (): Promise<boolean> => {
  // First check if we have any key available
  if (hasAnyApiKey()) return true;

  // Fallback to AI Studio selector
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const openApiKeySelector = async () => {
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};

// Helper to remove base64 header safely
const cleanBase64 = (base64: string) => {
  const commaIndex = base64.indexOf(',');
  return commaIndex !== -1 ? base64.substring(commaIndex + 1) : base64;
};

/**
 * Step 1: Analyze inputs using Gemini 3.0 Pro to create a master prompt based on the template.
 */
export const analyzeAndCreatePrompt = async (
  userImages: string[],
  sceneImages: string[],
  refImages: string[],
  userPrompt: string,
  baseTemplate: string,
  isGiantTemplate: boolean = false
): Promise<string> => {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error('未配置 API Key');

  const ai = new GoogleGenAI({ apiKey });

  // If no inputs are provided, return the base template directly
  if (userImages.length === 0 && sceneImages.length === 0 && refImages.length === 0 && !userPrompt) {
    return baseTemplate;
  }

  const parts: any[] = [];

  // Add images with explicit context labels for analysis
  userImages.forEach((img) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(img) } });
    parts.push({ text: "Input Image Type: [User Subject/Person]" });
  });

  sceneImages.forEach((img) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(img) } });
    parts.push({ text: "Input Image Type: [User Scene/Background]" });
  });

  refImages.forEach((img) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(img) } });
    parts.push({ text: "Input Image Type: [Style Reference]" });
  });

  // User instructions are always relevant
  parts.push({ text: `User Additional Text Instructions: "${userPrompt || 'None'}"` });

  const hasReferenceImage = refImages.length > 0;

  const referenceImageLogic = `
    1. **Objective**: Reconstruct the description of the [Style Reference] image, but perform specific SWAPS based on user uploads.
    2. **The "Unchanged" Rule**: 
       - If a visual element (Pose, Clothing, Art Style, Props) is in [Style Reference] and NOT explicitly replaced by [User Subject] or [User Scene], it MUST be preserved.
       - **Strict Aesthetic Matching**: Pay special attention to the "Style Reference" regarding **Skin Texture**, **Camera Lens Characteristics**, and **Composition**.
    3. **The "Swap" Rule (CRITICAL)**:
       - **Subject Swap**: If [User Subject] is present, describe the main character in the [Style Reference] but with the *face, hair, and physical identity* of the [User Subject].
       - **Background Swap**: If [User Scene] is present:
          - You MUST describe the location, lighting, and time of day VISIBLE in the [User Scene] image.
          - **OVERRIDE**: Ignore the lighting/atmosphere of the [Style Reference] if it conflicts with the [User Scene].
          - **FUSION**: Describe the [User Scene] as the setting, but mapped to the *Perspective/Camera Angle* of the [Style Reference].
  `;

  const templateLogic = `
    1. **Objective**: Execute the scene described in the **Base Text Template** (Master Script), casting the uploaded images into the roles.
    2. **Strict Text Adherence (Subject/Pose)**:
       - The **Base Text Template** is the authority for **Action**, **Pose**, **Clothing**, and **Camera Angle**.
    3. **The "Cast & Location" Swap (CRITICAL)**:
       - **Subject Integration**: If [User Subject] is provided, the character described in the text MUST take on the **Identity** of the [User Subject].
       - **Background Integration**: If [User Scene] is provided:
          - You MUST describe the location, lighting, time of day, and weather VISIBLE in the [User Scene] image.
          - **OVERRIDE**: You MUST IGNORE any lighting, sky, or environmental descriptions in the Base Text Template.
          - **FUSION**: Place the subject into this [User Scene] environment using the *Pose* and *Camera Angle* from the Template.
    4. **Result**: A fusion where the [User Subject] is enacting the **Base Text Template** pose/action, but physically located inside the [User Scene] environment.
  `;

  const systemInstruction = `
    You are an expert Image Prompt Reverse-Engineer and Reconstructionist.
    
    YOUR TASK:
    Write a highly detailed image generation prompt for the "Banana Pro" model.
    
    **SAFETY CONSTRAINT (CRITICAL)**:
    - You MUST ensure the output prompt is SAFE for image generation.
    - **Do NOT** include sexually explicit, nude, highly suggestive, or provocative descriptions.
    - If the user input or reference image implies nudity or restricted content, you MUST describe the subject as wearing appropriate clothing.
    - Avoid terms like "cleavage", "soft tissue volume", "provocative", or overly specific anatomical focus.

    **MODE SELECTION**:
    ${hasReferenceImage ?
      `>> MODE: STYLE REFERENCE RECONSTRUCTION
       - **Source of Truth**: The [Style Reference] image for Composition/Style.
       - **Source of Truth (Background)**: The [User Scene] image (if provided) for Lighting/Environment.
       - **Action**: Describe the [Style Reference] structure, but swap the environment with the [User Scene]'s description.`
      :
      `>> MODE: TEMPLATE FUSION
       - **Source of Truth**: The Base Text Template for Pose/Action/Angle.
       - **Source of Truth (Background)**: The [User Scene] image (if provided) for Lighting/Environment.
       - **Action**: Use the Text Template script, but rewrite the setting description to match the [User Scene].`
    }

    --- BASE TEXT TEMPLATE (Only use in Template Fusion Mode) ---
    ${hasReferenceImage ? "(IGNORE TEMPLATE)" : baseTemplate}
    -------------------------------------------------------------

    SPECIFIC INSTRUCTIONS:
    ${hasReferenceImage ? referenceImageLogic : templateLogic}

    OUTPUT:
    - Return ONLY the final, descriptive English prompt. Do not add explanations.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    return response.text || (hasReferenceImage ? "A high quality image" : baseTemplate);
  } catch (error) {
    console.error("Analysis failed:", error);
    return hasReferenceImage ? "A high quality image based on the reference." : baseTemplate;
  }
};

/**
 * Step 2: Generate Image using Gemini 3 Pro Image (Banana Pro)
 */
export const generateImage = async (
  finalPrompt: string,
  resolution: Resolution,
  aspectRatio: AspectRatio,
  referenceImages: { user?: string, scene?: string, style?: string } = {}
): Promise<string> => {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error('未配置 API Key');

  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [];

  if (referenceImages.user) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(referenceImages.user) } });
    parts.push({ text: "Reference Image [ID_SOURCE]: Use this face/identity. Map this identity onto the subject in the composition." });
  }

  if (referenceImages.scene) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(referenceImages.scene) } });
    parts.push({ text: "Reference Image [BG_SOURCE]: Use this exact environment. PRESERVE the lighting, color palette, time of day, and mood of this image." });
  }

  if (referenceImages.style) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(referenceImages.style) } });
    parts.push({ text: "Reference Image [MASTER_COMPOSITION]: This image defines the POSE, ANGLE, CLOTHING, and STYLE. Result must look like this image, but with the [ID_SOURCE] identity and [BG_SOURCE] background swapped in." });
  }

  parts.push({ text: `Create a photorealistic image based on this description: ${finalPrompt}` });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: resolution,
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      if (response.promptFeedback) {
        console.error("Prompt Feedback:", response.promptFeedback);
        throw new Error("图片生成被安全过滤器拦截，请调整描述后重试");
      }
      throw new Error("模型未返回任何结果");
    }

    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    const textPart = candidate.content?.parts?.find(p => p.text)?.text;
    if (textPart) {
      throw new Error(`模型拒绝生成: "${textPart.substring(0, 150)}..."`);
    }

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`生成中断: ${candidate.finishReason}`);
    }

    throw new Error("未收到图片数据");
  } catch (error: any) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

/**
 * Edit/Inpaint existing image
 */
export const editImage = async (
  originalImageBase64: string,
  editPrompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error('未配置 API Key');

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64(originalImageBase64),
            },
          },
          { text: `Edit this image: ${editPrompt}` },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("未收到响应");

    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    const textPart = candidate.content?.parts?.find(p => p.text)?.text;
    if (textPart) {
      throw new Error(`模型拒绝修改: "${textPart}"`);
    }

    throw new Error("未收到修改后的图片");
  } catch (error) {
    console.error("Image editing failed:", error);
    throw error;
  }
};
