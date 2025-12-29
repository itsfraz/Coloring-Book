
import React, { useState, useCallback } from 'react';
import { Button } from './components/Button';
import { Scene, AppStatus, Complexity } from './types';
import { generateBookScenes, generateLineArt, generateColoredArt } from './services/geminiService';
import { ColorCanvas } from './components/ColorCanvas';
import { jsPDF } from 'jspdf';

const App: React.FC = () => {
  const [theme, setTheme] = useState('');
  const [complexity, setComplexity] = useState<Complexity>('simple');
  const [status, setStatus] = useState<AppStatus>('IDLE');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeColoringScene, setActiveColoringScene] = useState<Scene | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number, total: number } | null>(null);

  const generatePDF = async (bookScenes: Scene[], isSingle: boolean = false) => {
    const doc = new jsPDF();
    const readyScenes = bookScenes.filter(s => s.imageUrl);
    const primaryColor = complexity === 'detailed' ? [79, 70, 229] : [250, 204, 21]; // Indigo vs Yellow
    
    if (!isSingle) {
      // 1. Cover Page
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setFontSize(50);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text("ColorJoy", 105, 80, { align: 'center' });
      
      doc.setFontSize(28);
      const splitTitle = doc.splitTextToSize(`My ${theme} Coloring Book`, 160);
      doc.text(splitTitle, 105, 110, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text(`A ${complexity === 'detailed' ? 'Big Kid' : 'Little Artist'} Collection`, 105, 130, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text("Created with Gemini AI", 105, 280, { align: 'center' });

      // 2. Personalization Page
      doc.addPage();
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(2);
      doc.rect(20, 20, 170, 257);
      
      doc.setFontSize(24);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("This book belongs to:", 105, 120, { align: 'center' });
      
      doc.setDrawColor(200, 200, 200);
      doc.line(40, 150, 170, 150);
      
      doc.setFontSize(14);
      doc.text("Masterpiece Creator", 105, 160, { align: 'center' });
    }

    // 3. Add each scene
    for (let i = 0; i < readyScenes.length; i++) {
      if (isSingle && i > 0) break;
      if (!isSingle || (isSingle && i === 0)) {
        if (!isSingle || i > 0) doc.addPage();
      }
      
      const scene = readyScenes[i];
      
      // Page Header
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text(scene.title, 20, 25);
      
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(isSingle ? "Special Page" : `Page ${i + 1} of ${readyScenes.length}`, 190, 25, { align: 'right' });

      // The coloring image (Line Art) - Large and Centered
      if (scene.imageUrl) {
        doc.setDrawColor(245, 245, 245);
        doc.rect(14, 39, 182, 182); 
        doc.addImage(scene.imageUrl, 'PNG', 15, 40, 180, 180);
      }

      // The Reference Guide "Sticker"
      if (scene.coloredImageUrl) {
        const refX = 145;
        const refY = 40;
        const refSize = 45;
        
        // Shadow/Border Effect
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.rect(refX - 2, refY - 2, refSize + 4, refSize + 8, 'FD');
        
        doc.addImage(scene.coloredImageUrl, 'PNG', refX, refY, refSize, refSize);
        
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        doc.text("Coloring Idea", refX + (refSize / 2), refY + refSize + 4, { align: 'center' });
      }

      // Suggested Palette at Bottom
      if (scene.suggestedPalette && scene.suggestedPalette.length > 0) {
        const pX = 20;
        const pY = 228;
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'bold');
        doc.text("SUGGESTED COLORS:", pX, pY);
        
        scene.suggestedPalette.forEach((hex, idx) => {
          doc.setFillColor(hex);
          doc.circle(pX + 45 + (idx * 12), pY - 1, 4, 'F');
        });
      }

      // Description at bottom
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      const splitDesc = doc.splitTextToSize(scene.description, 170);
      doc.text(splitDesc, 20, 245);
      
      // Outer border for the whole page
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.rect(10, 10, 190, 277);
    }

    const fileName = isSingle ? `Coloring_Page_${bookScenes[0].title.replace(/\s+/g, '_')}.pdf` : `${theme.replace(/\s+/g, '_')}_Coloring_Book.pdf`;
    doc.save(fileName);
  };

  const handleStartGeneration = async (count: number = 8) => {
    if (!theme.trim()) return;
    setStatus('GENERATING_SCENES');
    setError(null);
    try {
      const generatedScenes = await generateBookScenes(theme, complexity, count);
      setScenes(generatedScenes);
      setStatus('BOOK_READY');
    } catch (err: any) {
      console.error(err);
      setError("Oops! My creative robot is having a little nap. Try again!");
      setStatus('IDLE');
    }
  };

  const handleGenerateFullBook = async () => {
    if (!theme.trim()) return;
    setStatus('GENERATING_SCENES');
    setError(null);
    setBulkProgress({ current: 0, total: 8 });

    try {
      const generatedScenes = await generateBookScenes(theme, complexity, 8);
      setScenes(generatedScenes);
      const updatedScenes = [...generatedScenes];

      for (let i = 0; i < updatedScenes.length; i++) {
        setBulkProgress({ current: i + 1, total: 8 });
        try {
          const [lineArtUrl, coloredUrl] = await Promise.all([
            generateLineArt(updatedScenes[i].imagePrompt, complexity),
            generateColoredArt(updatedScenes[i].imagePrompt)
          ]);
          
          updatedScenes[i].imageUrl = lineArtUrl;
          updatedScenes[i].coloredImageUrl = coloredUrl;
          setScenes([...updatedScenes]);
        } catch (imgErr) {
          console.error(`Failed to generate page ${i + 1}`, imgErr);
        }
      }

      await generatePDF(updatedScenes);
      setBulkProgress(null);
      setStatus('BOOK_READY');
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong with the magic book maker. Try again!");
      setBulkProgress(null);
      setStatus('IDLE');
    }
  };

  const handleGenerateImage = async (sceneId: string) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    const newScenes = [...scenes];
    newScenes[sceneIndex].isGenerating = true;
    setScenes(newScenes);

    try {
      const [lineArtUrl, coloredUrl] = await Promise.all([
        generateLineArt(newScenes[sceneIndex].imagePrompt, complexity),
        generateColoredArt(newScenes[sceneIndex].imagePrompt)
      ]);
      
      const updatedScenes = [...scenes];
      updatedScenes[sceneIndex].imageUrl = lineArtUrl;
      updatedScenes[sceneIndex].coloredImageUrl = coloredUrl;
      updatedScenes[sceneIndex].isGenerating = false;
      setScenes(updatedScenes);
    } catch (err: any) {
      console.error(err);
      const updatedScenes = [...scenes];
      updatedScenes[sceneIndex].isGenerating = false;
      setScenes(updatedScenes);
      setError("I couldn't draw that picture. Let's try again!");
    }
  };

  const handleReset = () => {
    setTheme('');
    setScenes([]);
    setStatus('IDLE');
    setBulkProgress(null);
  };

  const someImagesReady = scenes.some(s => s.imageUrl);

  const popularThemes = [
    { name: 'Castle Village', icon: '🏘️' },
    { name: 'Space Explorers', icon: '🚀' },
    { name: 'Magic Kingdom', icon: '🏰' },
    { name: 'Dinosaur Kingdom', icon: '🦖' },
    { name: 'Robot Factory', icon: '🤖' }
  ];

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col">
      <header className="bg-white border-b-4 border-yellow-400 p-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
            <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center text-white text-2xl rotate-3 shadow-md">
              <i className="fas fa-palette"></i>
            </div>
            <h1 className="text-3xl font-black text-yellow-600 tracking-tight hidden sm:block">ColorJoy</h1>
          </div>
          
          {status !== 'IDLE' && (
            <div className="flex items-center gap-2">
               <div className="hidden md:flex bg-gray-100 rounded-full p-1 mr-4">
                  <button 
                    onClick={() => setComplexity('simple')}
                    className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${complexity === 'simple' ? 'bg-yellow-400 text-white shadow-sm' : 'text-gray-400'}`}
                  >
                    Simple
                  </button>
                  <button 
                    onClick={() => setComplexity('detailed')}
                    className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${complexity === 'detailed' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400'}`}
                  >
                    Big Kid (10-12)
                  </button>
               </div>
              <Button variant="secondary" size="sm" onClick={handleReset}>
                <i className="fas fa-plus mr-2"></i> New
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col">
        {status === 'IDLE' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-6 max-w-2xl">
              <div className="float-animation inline-block p-4 bg-white rounded-full shadow-lg border-4 border-yellow-200">
                <span className="text-6xl">🎨</span>
              </div>
              <h2 className="text-5xl font-black text-gray-800 leading-tight">
                Create Your Very Own <br/>
                <span className="text-yellow-500">Coloring Book!</span>
              </h2>
              <p className="text-xl text-gray-600 font-medium">
                Generate an <span className="text-indigo-600 font-bold">8-page PDF</span> with vibrant colored guides to help you paint!
              </p>
              
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex justify-center items-center gap-4 bg-white p-2 rounded-2xl shadow-sm self-center border-2 border-yellow-100">
                  <button 
                    onClick={() => setComplexity('simple')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-bold ${complexity === 'simple' ? 'bg-yellow-400 text-white scale-105 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <i className="fas fa-shapes"></i> Little Artist
                  </button>
                  <button 
                    onClick={() => setComplexity('detailed')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-bold ${complexity === 'detailed' ? 'bg-indigo-600 text-white scale-105 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <i className="fas fa-microscope"></i> Big Kid Art (10-12)
                  </button>
                </div>

                <div className="relative group flex flex-col gap-4">
                  <input 
                    type="text" 
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder={complexity === 'detailed' ? "Describe a village, a forest, or a city..." : "Describe a simple story theme..."}
                    className="w-full p-6 text-xl text-gray-800 rounded-3xl border-4 border-yellow-200 bg-white shadow-xl focus:border-yellow-400 focus:outline-none transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateFullBook()}
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      size="lg" 
                      variant="accent"
                      className="flex-1 text-2xl py-6" 
                      onClick={handleGenerateFullBook}
                      disabled={!theme}
                    >
                      <i className="fas fa-file-pdf mr-3"></i> Download 8-Page Book
                    </Button>
                    <Button 
                      size="lg" 
                      variant="secondary"
                      className="px-8" 
                      onClick={() => handleStartGeneration(8)}
                      disabled={!theme}
                    >
                      <i className="fas fa-images mr-2"></i> Preview Pages
                    </Button>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 font-bold animate-bounce mt-4">{error}</p>}
            </div>
          </div>
        )}

        {status === 'GENERATING_SCENES' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-20">
            <div className="relative">
              <div className={`w-24 h-24 border-8 border-yellow-100 rounded-full animate-spin ${complexity === 'detailed' ? 'border-t-indigo-600' : 'border-t-yellow-400'}`}></div>
              <div className="absolute inset-0 flex items-center justify-center text-4xl">{complexity === 'detailed' ? '🔍' : '✨'}</div>
            </div>
            <div className="text-center">
              <h3 className="text-3xl font-black text-gray-800">
                {bulkProgress ? `Building Your Magic Book...` : `Generating Your Story...`}
              </h3>
              {bulkProgress && (
                <div className="mt-4">
                  <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden mx-auto border-2 border-white shadow-sm">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-indigo-600 font-black mt-2">
                    Drawing page {bulkProgress.current} of {bulkProgress.total}...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'BOOK_READY' && (
          <div className="animate-in fade-in duration-700">
            <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border-2 border-yellow-100">
              <div className="text-center md:text-left">
                <div className={`inline-block px-4 py-1 text-white rounded-full text-xs font-black uppercase tracking-widest mb-2 shadow-sm ${complexity === 'detailed' ? 'bg-indigo-600' : 'bg-yellow-400'}`}>
                  {complexity === 'detailed' ? 'Big Kid Mode (10-12)' : 'Little Artist Mode'}
                </div>
                <h2 className="text-3xl font-black text-gray-800">"{theme}" Collection</h2>
              </div>
              <div className="flex gap-3">
                {someImagesReady && (
                  <Button 
                    variant="accent" 
                    onClick={() => generatePDF(scenes)}
                    className="shadow-lg hover:scale-105"
                  >
                    <i className="fas fa-file-pdf mr-2"></i> Save Full Book
                  </Button>
                )}
                <Button variant="secondary" onClick={handleReset}>
                  <i className="fas fa-redo mr-2"></i> Start Over
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {scenes.map((scene, index) => (
                <div key={scene.id} className="bg-white rounded-[2rem] p-4 shadow-xl border-b-4 border-gray-100 hover:border-indigo-200 transition-all group overflow-hidden flex flex-col relative">
                  <div className="aspect-square bg-gray-50 rounded-[1.5rem] overflow-hidden mb-4 relative border-2 border-dashed border-gray-100">
                    {scene.imageUrl ? (
                      <div className="relative w-full h-full">
                        <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-contain p-1" />
                        {scene.coloredImageUrl && (
                          <div className="absolute top-2 right-2 w-12 h-12 rounded-lg border-2 border-white shadow-md overflow-hidden rotate-3 hover:scale-110 transition-transform cursor-help group/thumb">
                             <img src={scene.coloredImageUrl} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center">
                               <i className="fas fa-eye text-white text-[10px]"></i>
                             </div>
                          </div>
                        )}
                        {scene.suggestedPalette && (
                          <div className="absolute bottom-2 left-2 flex gap-1 bg-white/80 p-1 rounded-full backdrop-blur-sm">
                            {scene.suggestedPalette.map(c => (
                              <div key={c} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : scene.isGenerating ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                        <i className={`fas fa-pencil-alt text-2xl animate-bounce ${complexity === 'detailed' ? 'text-indigo-600' : 'text-yellow-400'}`}></i>
                        <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Creating...</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-5">
                         <i className="fas fa-image"></i>
                      </div>
                    )}
                  </div>

                  <div className="mb-4 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[10px] ${complexity === 'detailed' ? 'bg-indigo-600' : 'bg-yellow-400'}`}>
                        {index + 1}
                      </span>
                      <h4 className="font-black text-sm text-gray-800 line-clamp-1">{scene.title}</h4>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {!scene.imageUrl ? (
                      <Button 
                        onClick={() => handleGenerateImage(scene.id)} 
                        isLoading={scene.isGenerating}
                        size="sm"
                        className={`w-full ${complexity === 'detailed' ? 'bg-indigo-600 text-white hover:bg-indigo-500' : ''}`}
                      >
                        Draw
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="accent" 
                          size="sm"
                          className="flex-1"
                          onClick={() => setActiveColoringScene(scene)}
                        >
                          Color
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="px-3"
                          title="Download PDF Page"
                          onClick={() => generatePDF([scene], true)}
                        >
                          <i className="fas fa-file-pdf"></i>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {activeColoringScene && (
        <ColorCanvas 
          imageUrl={activeColoringScene.imageUrl!} 
          coloredImageUrl={activeColoringScene.coloredImageUrl}
          onClose={() => setActiveColoringScene(null)} 
        />
      )}
    </div>
  );
};

export default App;
