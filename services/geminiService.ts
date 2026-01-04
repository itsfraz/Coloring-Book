
import { GoogleGenAI, Type } from "@google/genai";
import { Scene, Complexity } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateBookScenes = async (theme: string, complexity: Complexity, count: number = 5): Promise<Scene[]> => {
  const complexityInstruction = complexity === 'detailed' 
    ? "Create engaging scenes for children with clear subjects and moderate detail. Avoid overwhelming patterns or tiny sections. Focus on clean outlines and distinct, easy-to-color parts while maintaining a polished look." 
    : "Create very simple, bold scenes for small children with large, clear focal points and minimal background clutter.";

  const prompt = `Create a ${count}-page coloring book concept about "${theme}". 
    ${complexityInstruction}
    For each page, provide a title, a short 1-sentence description of the scene, and a detailed prompt for a text-to-image generator.
    Also, suggest a palette of 5 vibrant HEX color codes that would look great for this specific scene.
    The image prompt should describe a ${complexity} line-art scene suitable for coloring.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            suggestedPalette: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "description", "imagePrompt", "suggestedPalette"]
        }
      }
    }
  });

  const rawScenes = JSON.parse(response.text || "[]");
  return rawScenes.map((s: any, index: number) => ({
    ...s,
    id: `scene-${Date.now()}-${index}`,
  }));
};

export const generateLineArt = async (scenePrompt: string, complexity: Complexity): Promise<string> => {
  const complexityModifiers = complexity === 'detailed'
    ? "clean line art, defined coloring sections, professional style, crisp lines, clear subjects, manageable detail, open spaces, no grayscale, no shading, easy to color"
    : "simple bold line art, large coloring areas, thick clean lines, minimal detail, very clear shapes for young children";

  const enhancedPrompt = `${scenePrompt}. High-quality coloring book page, black and white line art, ${complexityModifiers}, white background, no solid blacks, vector style, perfect white and black contrast, no gradients, clean white spaces.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: enhancedPrompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  
  throw new Error("Failed to generate image");
};

export const generateColoredArt = async (scenePrompt: string): Promise<string> => {
  const coloredPrompt = `${scenePrompt}. Vibrant, colorful children's book illustration, flat colors, friendly and cheerful style, high quality, soft lighting, no text, clean composition.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: coloredPrompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  
  throw new Error("Failed to generate colored image");
};
