# 🎨 ColorJoy: AI-Powered Coloring Book Creator

ColorJoy is an enchanting web application that transforms any child's imagination into a beautiful, personalized coloring book. Powered by Google's Gemini AI, it generates custom themes, high-quality line art, and vibrant inspiration guides.

## ✨ Features

- **AI Theme Generation:** Type any concept (e.g., "Underwater Tea Party", "Galactic Dinosaur Racing") and get 8 unique, themed scenes.
- **Dual Complexity Modes:** 
  - **Little Artist:** Simple, bold lines for younger children.
  - **Big Kid Art (10-12):** Intricate patterns and detailed architecture for older artists.
- **Interactive Digital Canvas:** 
  - Professional tools: Pencils, Markers, Spray Paint, and Erasers.
  - Undo/Redo support.
  - "Idea Guide" toggle to show a pre-colored version of the scene.
- **Premium PDF Export:**
  - High-quality line art pages.
  - Full-color "Inspiration Guide" stickers on every page.
  - Suggested color palettes based on the scene's theme.
  - Personalized "This Book Belongs To" cover page.

## 🚀 How to Use

### 1. Set Up Your Environment
The app requires a Google Gemini API Key. Ensure the `process.env.API_KEY` is configured in your hosting environment or local development setup. You can obtain a key from [Google AI Studio](https://aistudio.google.com/).

### 2. Local Development
Since the app uses ES6 modules via an import map in `index.html`, you can serve it using any simple static file server.

**Using Python:**
```bash
python -m http.server 8000
```

**Using Node.js (serve):**
```bash
npx serve .
```

### 3. Creating Your First Book
1. **Pick a Theme:** Type a description in the main box (e.g., "Magical Forest Animals").
2. **Choose Mode:** Select "Little Artist" or "Big Kid".
3. **Generate:**
   - Click **"Download 8-Page Book"** to let the AI generate everything and give you a PDF instantly.
   - Click **"Preview Pages"** to see the scene titles first and generate images one by one.
4. **Color Digitally:** Click "Color" on any generated image to open the interactive art studio.
5. **Print & Play:** Download the PDF to print at home for a classic coloring experience!

## 🛠️ Technology Stack

- **Frontend:** React, Tailwind CSS, FontAwesome.
- **AI Models:** 
  - `gemini-3-flash-preview` (Story & Scene Planning).
  - `gemini-2.5-flash-image` (High-quality Line Art & Colored Guides).
- **Export:** `jsPDF` for dynamic document generation.

---
Built with ❤️ for the next generation of artists.