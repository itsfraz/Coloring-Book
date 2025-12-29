
import React, { useRef, useEffect, useState } from 'react';

interface ColorCanvasProps {
  imageUrl: string;
  coloredImageUrl?: string;
  onClose: () => void;
}

type BrushType = 'pencil' | 'marker' | 'spray' | 'eraser';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', 
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
  '#000000', '#ffffff'
];

export const ColorCanvas: React.FC<ColorCanvasProps> = ({ imageUrl, coloredImageUrl, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(15);
  const [brushType, setBrushType] = useState<BrushType>('marker');
  const [showReference, setShowReference] = useState(false);
  
  // Undo/Redo History
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(dataUrl);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => {
      const newIdx = prev + 1;
      return newIdx >= 50 ? 49 : newIdx;
    });
  };

  const loadFromHistory = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !history[index]) return;

    const img = new Image();
    img.src = history[index];
    img.onload = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadFromHistory(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadFromHistory(newIndex);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const parentWidth = containerRef.current?.clientWidth || 800;
      const scale = parentWidth / img.width;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      originalImgRef.current = img;
      saveToHistory();
    };
  }, [imageUrl]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas && originalImgRef.current) {
        ctx.beginPath();
        // If we were erasing, we might have covered the lines.
        // Redraw line art on top with multiply to ensure lines are always visible.
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(originalImgRef.current, 0, 0, canvas.width, canvas.height);
      }
      saveToHistory();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (brushType === 'eraser') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = brushSize * 1.5;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (brushType === 'spray') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = brushColor;
      const density = 20 + (brushSize / 2);
      for (let i = 0; i < density; i++) {
        const offsetX = (Math.random() - 0.5) * brushSize * 2;
        const offsetY = (Math.random() - 0.5) * brushSize * 2;
        ctx.fillRect(x + offsetX, y + offsetY, 1.5, 1.5);
      }
    } else if (brushType === 'pencil') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = Math.max(2, brushSize / 4);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else { // marker
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !originalImgRef.current) return;
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImgRef.current, 0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'my-coloring-masterpiece.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const tools: { id: BrushType; icon: string; label: string }[] = [
    { id: 'pencil', icon: 'fa-pencil', label: 'Pencil' },
    { id: 'marker', icon: 'fa-marker', label: 'Marker' },
    { id: 'spray', icon: 'fa-spray-can', label: 'Spray' },
    { id: 'eraser', icon: 'fa-eraser', label: 'Eraser' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-w-7xl w-full h-[90vh]">
        
        {/* Left Toolbar: Colors & Brushes */}
        <div className="p-4 bg-gray-50 flex md:flex-col items-center gap-6 overflow-x-auto border-b md:border-b-0 md:border-r w-full md:w-32">
          
          {/* Brush Types */}
          <div className="flex flex-row md:flex-col gap-2">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setBrushType(tool.id)}
                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${brushType === tool.id ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-white text-gray-400 hover:text-gray-600 shadow-sm'}`}
                title={tool.label}
              >
                <i className={`fas ${tool.icon} text-lg`}></i>
                <span className="text-[8px] font-bold mt-1 uppercase">{tool.label}</span>
              </button>
            ))}
          </div>

          <div className="hidden md:block w-full h-px bg-gray-200" />

          {/* Color Swatches */}
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => {
                  setBrushColor(color);
                  if (brushType === 'eraser') setBrushType('marker');
                }}
                className={`w-10 h-10 rounded-full border-4 flex-shrink-0 transition-transform ${brushColor === color && brushType !== 'eraser' ? 'scale-125 border-white ring-2 ring-indigo-400 z-10' : 'border-white hover:scale-110'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div ref={containerRef} className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center p-6 relative">
           <canvas
             ref={canvasRef}
             onMouseDown={startDrawing}
             onMouseMove={draw}
             onMouseUp={stopDrawing}
             onMouseLeave={stopDrawing}
             onTouchStart={startDrawing}
             onTouchMove={draw}
             onTouchEnd={stopDrawing}
             className="bg-white shadow-2xl cursor-crosshair touch-none rounded-sm"
           />

           {/* Reference Overlay */}
           {showReference && coloredImageUrl && (
             <div className="absolute top-6 right-6 w-48 md:w-72 aspect-square bg-white p-2 rounded-2xl shadow-2xl border-4 border-indigo-400 animate-in zoom-in duration-300 z-20">
               <div className="flex justify-between items-center px-2 mb-1">
                  <p className="text-[10px] font-black text-indigo-500 uppercase">Inspiration</p>
                  <button onClick={() => setShowReference(false)} className="text-gray-400 hover:text-gray-600">
                    <i className="fas fa-times"></i>
                  </button>
               </div>
               <img src={coloredImageUrl} alt="Reference" className="w-full h-full object-cover rounded-xl" />
             </div>
           )}
        </div>

        {/* Right/Bottom Controls */}
        <div className="p-4 bg-gray-50 flex md:flex-col items-center gap-4 border-t md:border-t-0 md:border-l w-full md:w-48">
          
          {/* Size Slider */}
          <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Thickness</label>
              <span className="text-[10px] font-bold text-gray-600">{brushSize}px</span>
            </div>
            <input 
              type="range" 
              min="2" max="100" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="w-full h-px bg-gray-200 hidden md:block" />

          {/* Undo/Redo Group */}
          <div className="flex w-full gap-2">
            <button 
              onClick={handleUndo} 
              disabled={historyIndex <= 0}
              className="flex-1 py-3 bg-white rounded-2xl shadow-sm hover:bg-gray-50 disabled:opacity-30 text-gray-700 transition-all active:scale-95 border border-gray-100" 
              title="Undo"
            >
              <i className="fas fa-undo"></i>
            </button>
            <button 
              onClick={handleRedo} 
              disabled={historyIndex >= history.length - 1}
              className="flex-1 py-3 bg-white rounded-2xl shadow-sm hover:bg-gray-50 disabled:opacity-30 text-gray-700 transition-all active:scale-95 border border-gray-100" 
              title="Redo"
            >
              <i className="fas fa-redo"></i>
            </button>
          </div>

          {/* Reference Toggle */}
          {coloredImageUrl && (
            <button 
              onClick={() => setShowReference(!showReference)} 
              className={`w-full py-4 rounded-2xl shadow-md font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${showReference ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-2 border-indigo-100'}`}
            >
              <i className={`fas ${showReference ? 'fa-eye-slash' : 'fa-lightbulb'}`}></i>
              {showReference ? 'HIDE GUIDE' : 'IDEA GUIDE'}
            </button>
          )}

          <div className="w-full h-px bg-gray-200 hidden md:block" />

          {/* Action Buttons */}
          <div className="flex w-full gap-2 mt-auto">
            <button 
              onClick={clearCanvas} 
              className="flex-1 py-3 bg-white border border-red-100 rounded-2xl shadow-sm hover:bg-red-50 text-red-500 transition-all active:scale-95" 
              title="Clear All"
            >
              <i className="fas fa-trash-can"></i>
            </button>
            <button 
              onClick={saveImage} 
              className="flex-1 py-3 bg-white border border-green-100 rounded-2xl shadow-sm hover:bg-green-50 text-green-500 transition-all active:scale-95" 
              title="Save to Device"
            >
              <i className="fas fa-floppy-disk"></i>
            </button>
          </div>
          
          <button 
            onClick={onClose} 
            className="w-full py-4 bg-gray-800 text-white rounded-2xl shadow-xl hover:bg-gray-900 font-black text-xs uppercase tracking-widest transition-all active:scale-95 mt-2"
          >
            Finish Art
          </button>
        </div>

      </div>
    </div>
  );
};
