
import React, { useRef, useEffect, useState } from 'react';

interface ColorCanvasProps {
  imageUrl: string;
  coloredImageUrl?: string;
  onClose: () => void;
}

type ToolType = 'pencil' | 'marker' | 'crayon' | 'spray' | 'bucket' | 'eraser';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', 
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
  '#000000', '#ffffff'
];

interface Point {
  x: number;
  y: number;
}

export const ColorCanvas: React.FC<ColorCanvasProps> = ({ imageUrl, coloredImageUrl, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const pointsRef = useRef<Point[]>([]);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(15);
  const [activeTool, setActiveTool] = useState<ToolType>('marker');
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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

  const getMousePos = (e: React.MouseEvent | React.TouchEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'bucket') {
      handleBucketFill(e);
      return;
    }
    const pos = getMousePos(e);
    pointsRef.current = [pos];
    setIsDrawing(true);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      pointsRef.current = [];
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas && originalImgRef.current) {
        ctx.beginPath();
        // Redraw line art on top with multiply to ensure lines are always sharp
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(originalImgRef.current, 0, 0, canvas.width, canvas.height);
      }
      saveToHistory();
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const handleBucketFill = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pos = getMousePos(e);
    const startX = Math.round(pos.x);
    const startY = Math.round(pos.y);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const getPixelIndex = (x: number, y: number) => (y * canvas.width + x) * 4;
    const startIdx = getPixelIndex(startX, startY);
    const startR = pixels[startIdx];
    const startG = pixels[startIdx + 1];
    const startB = pixels[startIdx + 2];

    const targetColor = hexToRgb(brushColor);
    if (startR === targetColor.r && startG === targetColor.g && startB === targetColor.b) return;

    // Simple Flood Fill (Stack-based)
    const stack = [[startX, startY]];
    const visited = new Uint8Array(canvas.width * canvas.height);

    while (stack.length > 0) {
      const [currX, currY] = stack.pop()!;
      const idx = getPixelIndex(currX, currY);
      const visitedIdx = currY * canvas.width + currX;

      if (visited[visitedIdx]) continue;
      visited[visitedIdx] = 1;

      const r = pixels[idx];
      const g = pixels[idx+1];
      const b = pixels[idx+2];

      // Tolerance check (coloring books have lines, we fill only near-white/matching areas)
      const diff = Math.abs(r - startR) + Math.abs(g - startG) + Math.abs(b - startB);
      if (diff < 30) {
        pixels[idx] = targetColor.r;
        pixels[idx+1] = targetColor.g;
        pixels[idx+2] = targetColor.b;
        pixels[idx+3] = 255;

        if (currX > 0) stack.push([currX - 1, currY]);
        if (currX < canvas.width - 1) stack.push([currX + 1, currY]);
        if (currY > 0) stack.push([currX, currY - 1]);
        if (currY < canvas.height - 1) stack.push([currX, currY + 1]);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    
    // Always redraw lines on top after a fill
    if (originalImgRef.current) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(originalImgRef.current, 0, 0, canvas.width, canvas.height);
    }
    saveToHistory();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    pointsRef.current.push(pos);
    const points = pointsRef.current;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Helper to get midpoint for Bezier interpolation
    const midPointBtw = (p1: Point, p2: Point) => {
      return {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2
      };
    };

    switch (activeTool) {
      case 'eraser':
      case 'pencil':
      case 'marker': {
        const isEraser = activeTool === 'eraser';
        ctx.globalCompositeOperation = isEraser ? 'source-over' : 'multiply';
        ctx.strokeStyle = isEraser ? 'white' : brushColor;
        
        let width = brushSize;
        if (activeTool === 'eraser') width *= 1.5;
        if (activeTool === 'pencil') width = Math.max(1, width / 6);
        ctx.lineWidth = width;
        
        if (activeTool === 'marker') ctx.globalAlpha = 0.8;

        ctx.clearRect(0, 0, 0, 0); // Hack to flush buffer sometimes
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        if (points.length < 3) {
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        } else {
          // Quadratic Bezier interpolation for smooth paths
          for (let i = 1; i < points.length - 2; i++) {
            const cp = points[i];
            const end = midPointBtw(points[i], points[i + 1]);
            ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y);
          }
          // For the last 2 points
          const lastIdx = points.length - 2;
          ctx.quadraticCurveTo(
            points[lastIdx].x,
            points[lastIdx].y,
            points[lastIdx + 1].x,
            points[lastIdx + 1].y
          );
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
        break;
      }

      case 'spray': {
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = brushColor;
        const density = 30 + (brushSize / 2);
        for (let i = 0; i < density; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * brushSize;
          const offsetX = Math.cos(angle) * radius;
          const offsetY = Math.sin(angle) * radius;
          ctx.globalAlpha = Math.random() * 0.5;
          ctx.fillRect(pos.x + offsetX, pos.y + offsetY, 1 + Math.random(), 1 + Math.random());
        }
        ctx.globalAlpha = 1.0;
        break;
      }

      case 'crayon': {
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        // Jitter logic for crayon texture - slightly more points for smoother but still "jittery" feel
        for (let i = 0; i < 3; i++) {
          const jX = pos.x + (Math.random() - 0.5) * (brushSize / 4);
          const jY = pos.y + (Math.random() - 0.5) * (brushSize / 4);
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          const prev = points[points.length - 2] || points[0];
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(jX, jY);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
        break;
      }
      
      case 'bucket':
        // No dragging for bucket
        break;
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

  const tools: { id: ToolType; icon: string; label: string }[] = [
    { id: 'pencil', icon: 'fa-pencil', label: 'Pencil' },
    { id: 'marker', icon: 'fa-marker', label: 'Marker' },
    { id: 'crayon', icon: 'fa-crayon', label: 'Crayon' },
    { id: 'spray', icon: 'fa-spray-can', label: 'Spray' },
    { id: 'bucket', icon: 'fa-fill-drip', label: 'Bucket' },
    { id: 'eraser', icon: 'fa-eraser', label: 'Eraser' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-w-7xl w-full h-[90vh] animate-in zoom-in duration-300">
        
        {/* Left Toolbar: Colors & Brushes */}
        <div className="p-4 bg-gray-50 flex md:flex-col items-center gap-6 overflow-x-auto border-b md:border-b-0 md:border-r w-full md:w-36 scrollbar-hide">
          
          {/* Tool Selector */}
          <div className="grid grid-cols-3 md:grid-cols-1 gap-2 w-full">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 ${activeTool === tool.id ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-white text-gray-400 hover:text-gray-600 shadow-sm'}`}
                title={tool.label}
              >
                <i className={`fas ${tool.icon} text-xl`}></i>
                <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">{tool.label}</span>
              </button>
            ))}
          </div>

          <div className="hidden md:block w-full h-px bg-gray-200" />

          {/* Color Palette */}
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => {
                  setBrushColor(color);
                  if (activeTool === 'eraser') setActiveTool('marker');
                }}
                className={`w-10 h-10 rounded-full border-4 flex-shrink-0 transition-all duration-200 ${brushColor === color && activeTool !== 'eraser' ? 'scale-125 border-white ring-2 ring-indigo-400 z-10 shadow-md' : 'border-white hover:scale-110 shadow-sm'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div ref={containerRef} className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center p-4 md:p-8 relative">
           <div className="relative group">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="bg-white shadow-2xl cursor-crosshair touch-none rounded-sm max-w-full h-auto"
                style={{ imageRendering: 'auto' }}
              />
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform pointer-events-none">
                <i className={`fas ${tools.find(t => t.id === activeTool)?.icon} text-xs`}></i>
              </div>
           </div>

           {/* Reference Overlay */}
           {showReference && coloredImageUrl && (
             <div className="absolute top-6 right-6 w-48 md:w-80 aspect-square bg-white p-3 rounded-3xl shadow-2xl border-4 border-indigo-400 animate-in zoom-in slide-in-from-top-4 duration-300 z-30">
               <div className="flex justify-between items-center px-1 mb-2">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-lightbulb text-yellow-400"></i>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Inspiration</p>
                  </div>
                  <button onClick={() => setShowReference(false)} className="text-gray-300 hover:text-gray-600 transition-colors">
                    <i className="fas fa-times-circle text-lg"></i>
                  </button>
               </div>
               <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
                 <img src={coloredImageUrl} alt="Reference" className="w-full h-full object-cover" />
               </div>
             </div>
           )}
        </div>

        {/* Right Controls */}
        <div className="p-4 md:p-6 bg-gray-50 flex md:flex-col items-center gap-6 border-t md:border-t-0 md:border-l w-full md:w-56">
          
          {/* Brush Size Visualization */}
          <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-between items-end px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tip Size</label>
              <div 
                className="rounded-full bg-gray-300 mb-1" 
                style={{ width: Math.max(2, brushSize / 2), height: Math.max(2, brushSize / 2) }}
              />
            </div>
            <input 
              type="range" 
              min="2" max="100" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
            />
          </div>

          <div className="w-full h-px bg-gray-200 hidden md:block" />

          {/* History Controls */}
          <div className="flex w-full gap-3">
            <button 
              onClick={handleUndo} 
              disabled={historyIndex <= 0}
              className="flex-1 py-4 bg-white rounded-2xl shadow-sm hover:shadow-md hover:bg-gray-50 disabled:opacity-20 text-gray-700 transition-all active:scale-90 border border-gray-100" 
              title="Step Back"
            >
              <i className="fas fa-arrow-rotate-left"></i>
            </button>
            <button 
              onClick={handleRedo} 
              disabled={historyIndex >= history.length - 1}
              className="flex-1 py-4 bg-white rounded-2xl shadow-sm hover:shadow-md hover:bg-gray-50 disabled:opacity-20 text-gray-700 transition-all active:scale-90 border border-gray-100" 
              title="Step Forward"
            >
              <i className="fas fa-arrow-rotate-right"></i>
            </button>
          </div>

          {/* Inspiration Guide Toggle */}
          {coloredImageUrl && (
            <button 
              onClick={() => setShowReference(!showReference)} 
              className={`w-full py-4 rounded-2xl shadow-lg font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 border-b-4 ${showReference ? 'bg-indigo-600 text-white border-indigo-800' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-100'}`}
            >
              <i className={`fas ${showReference ? 'fa-eye-slash' : 'fa-wand-magic-sparkles'}`}></i>
              {showReference ? 'Hide Help' : 'Magic Help'}
            </button>
          )}

          <div className="w-full h-px bg-gray-200 hidden md:block" />

          {/* Bottom Actions */}
          <div className="flex w-full gap-3 mt-auto">
            <button 
              onClick={clearCanvas} 
              className="flex-1 py-4 bg-white border border-red-50 rounded-2xl shadow-sm hover:bg-red-50 hover:border-red-200 text-red-500 transition-all active:scale-95" 
              title="Clean Page"
            >
              <i className="fas fa-trash-can"></i>
            </button>
            <button 
              onClick={saveImage} 
              className="flex-1 py-4 bg-white border border-green-50 rounded-2xl shadow-sm hover:bg-green-50 hover:border-green-200 text-green-500 transition-all active:scale-95" 
              title="Save Art"
            >
              <i className="fas fa-cloud-arrow-down"></i>
            </button>
          </div>
          
          <button 
            onClick={onClose} 
            className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] shadow-xl hover:bg-black font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 mt-2"
          >
            I'm Done!
          </button>
        </div>

      </div>
    </div>
  );
};
