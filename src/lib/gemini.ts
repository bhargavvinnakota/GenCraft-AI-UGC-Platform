import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: import.meta.env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : "") || "" 
});

/**
 * Generates an ultra-realistic image with a focus on natural skin tones and minute details.
 */
export const generateUltraRealisticImage = async (prompt: string, aspect: "1:1" | "16:9" | "9:16" = "1:1") => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: `Hyper-realistic, professional photography, raw photo, 8k resolution, cinematic lighting, 
            natural skin texture, pores, fine details, subsurface scattering, mastered color grading. 
            Subject: ${prompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspect,
          imageSize: "2K",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model");
  } catch (error) {
    console.error("Ultra-Realistic Image Gen Error:", error);
    throw error;
  }
};

/**
 * Generates a video based on a prompt, useful for lip-sync and character motion simulations.
 */
export const generateAIVideo = async (prompt: string) => {
  try {
    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: `Photoreal video, cinematic motion, natural movement, high detail. Subject: ${prompt}`,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    // In a real app, you'd poll for 'operation.name'. 
    // For this simulation, we return the operation object or a mock result if it's instant.
    // Note: Video generation takes time.
    return operation;
  } catch (error) {
    console.error("Video Gen Error:", error);
    throw error;
  }
};

/**
 * Generates an expression sheet for a character to define personality DNA.
 */
export const generateExpressionSheet = async (dnaTraits: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: `9-way expression sheet of the same person. Grid layout. 
            Expressions: Neutral, Happy, Angry, Sad, Surprised, Thinking, Winking, Laughing, Sarcastic.
            Consistent character features: ${dnaTraits}. 
            White background, high fashion photography, hyper-realistic, 8k.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("No expression sheet data returned");
  } catch (error) {
    console.error("Expression Sheet Error:", error);
    throw error;
  }
};

/**
 * Analyzes an image for character traits to maintain consistency.
 */
export const extractCharacterTraits = async (base64Image: string, demographics?: {age: string, ethnicity: string, gender: string, bodyType: string, style: string}) => {
  try {
    const demoCtx = demographics 
      ? `Age: ${demographics.age}, Ethnicity: ${demographics.ethnicity}, Gender: ${demographics.gender}, Body: ${demographics.bodyType}, Style: ${demographics.style}. ` 
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/png',
            },
          },
          {
            text: `Extract high-precision biometric DNA for this person. ${demoCtx}
            Focus on: 
            1. Pores and skin micro-texture
            2. Eye orbital shape and iris patterns
            3. Lip volume and philtrum symmetry
            4. Bone structure (cheekbones, jawline)
            Provide a technical, reusable prompt block for a diffusion model prioritizing the specified demographics.`,
          },
        ],
      },
    });
    return response.text;
  } catch (error) {
    console.error("Trait Extraction Error:", error);
    throw error;
  }
};

export const analyzeImage = async (base64Image: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: mimeType,
            },
          },
          {
            text: "Detailed analysis for hyperrealism. Report on skin textures, lighting accuracy, and any artifacts. Suggest tags.",
          },
        ],
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const moderateContent = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Moderation check for safety and realism.
      Content: "${text}"
      Response format: STATUS: [APPROVED/REJECTED] | REASON: [Reason]`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Moderation Error:", error);
    throw error;
  }
};
