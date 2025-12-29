
export interface Scene {
  id: string;
  title: string;
  description: string;
  imagePrompt: string;
  suggestedPalette?: string[];
  imageUrl?: string;
  coloredImageUrl?: string;
  isGenerating?: boolean;
  isGeneratingColored?: boolean;
}

export type Complexity = 'simple' | 'detailed';

export interface ColoringBook {
  id: string;
  theme: string;
  scenes: Scene[];
  complexity: Complexity;
}

export type AppStatus = 'IDLE' | 'GENERATING_SCENES' | 'BOOK_READY' | 'COLORING';
