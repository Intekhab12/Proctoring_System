import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, IconButton, Slider, Divider, Tooltip, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteIcon from '@mui/icons-material/Delete';
import BrushIcon from '@mui/icons-material/Brush';
import CreateIcon from '@mui/icons-material/Create';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import PanToolIcon from '@mui/icons-material/PanTool';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

const COLORS = [
  '#000000', '#ffffff', '#e53935', '#1e88e5', '#43a047', 
  '#fb8c00', '#8e24aa', '#00acc1', '#f06292', '#fdd835'
];

const CANVAS_HEIGHT_COLLAPSED = 800;
const CANVAS_HEIGHT_EXPANDED = 1200;
const CANVAS_DRAW_HEIGHT = 2000; // Internal scrollable height

const Whiteboard = ({ questionId, savedData, onSave }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const containerRef = useRef(null);
  const isInitializedRef = useRef(false);
  const textInputRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [shapeStart, setShapeStart] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  // Text tool state
  const [textMode, setTextMode] = useState(false);
  const [textPos, setTextPos] = useState(null);
  const [textValue, setTextValue] = useState('');
  const [fontSize, setFontSize] = useState(18);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ y: 0, scrollTop: 0 });

  const containerHeight = isExpanded ? CANVAS_HEIGHT_EXPANDED : CANVAS_HEIGHT_COLLAPSED;

  // Initialize / resize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = Math.max(container.clientWidth, 300);
    const h = CANVAS_DRAW_HEIGHT;

    let existingDataUrl = null;
    if (isInitializedRef.current && canvas.width > 0 && canvas.height > 0) {
      existingDataUrl = canvas.toDataURL();
    }

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (existingDataUrl) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); };
      img.src = existingDataUrl;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    contextRef.current = ctx;
    isInitializedRef.current = true;
    setCanvasReady(true);
  }, [containerHeight, color, lineWidth]);

  // Init on mount + resize observer
  useEffect(() => {
    const timer = setTimeout(() => { initCanvas(); }, 50);

    const container = containerRef.current;
    let observer;
    if (container && window.ResizeObserver) {
      observer = new ResizeObserver(() => { initCanvas(); });
      observer.observe(container);
    }

    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [isExpanded]);

  // Load saved data when question changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Close any open text input
    commitText();
    setTextMode(false);
    setTextPos(null);
    setTextValue('');

    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const w = Math.max(container.clientWidth, 300);
      const h = CANVAS_DRAW_HEIGHT;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      if (savedData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          contextRef.current = ctx;
          const dataUrl = canvas.toDataURL();
          setHistory([dataUrl]);
          setHistoryIndex(0);
        };
        img.src = savedData;
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        contextRef.current = ctx;
        const dataUrl = canvas.toDataURL();
        setHistory([dataUrl]);
        setHistoryIndex(0);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [questionId]);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = lineWidth;
    }
  }, [color, lineWidth]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const dataUrl = canvas.toDataURL();
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(dataUrl);
      if (newHistory.length > 30) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // --- Text tool helpers ---
  const commitText = () => {
    if (!textPos || !textValue.trim()) {
      setTextPos(null);
      setTextValue('');
      setTextMode(false);
      return;
    }
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.save();
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';

    // Support multi-line
    const lines = textValue.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, textPos.x, textPos.y + i * (fontSize + 4));
    });
    ctx.restore();

    saveToHistory();
    if (onSave && canvasRef.current) {
      onSave(questionId, canvasRef.current.toDataURL());
    }

    setTextPos(null);
    setTextValue('');
    setTextMode(false);
  };

  // --- Drawing handlers ---
  const startDrawing = (e) => {
    if (tool === 'pan') {
      if (!e.touches) {
        setIsPanning(true);
        setPanStart({
          y: e.clientY,
          scrollTop: containerRef.current.scrollTop
        });
      }
      return; 
    }
    e.preventDefault();
    const { x, y } = getCoords(e);
    const ctx = contextRef.current;
    if (!ctx) return;

    // Text tool: place text input at click position
    if (tool === 'text') {
      // If already editing text, commit the previous one first
      if (textPos && textValue.trim()) {
        commitText();
      }
      setTextPos({ x, y });
      setTextValue('');
      setTextMode(true);
      // Focus the hidden input after a tick
      setTimeout(() => {
        if (textInputRef.current) textInputRef.current.focus();
      }, 50);
      return;
    }

    setIsDrawing(true);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (tool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = lineWidth * 4;
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
      }
    } else {
      setShapeStart({ 
        x, y, 
        snapshot: ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height) 
      });
    }
  };

  const draw = (e) => {
    if (tool === 'pan') {
      if (isPanning && !e.touches && containerRef.current) {
        const deltaY = e.clientY - panStart.y;
        containerRef.current.scrollTop = panStart.scrollTop - deltaY;
      }
      return;
    }
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    const ctx = contextRef.current;
    if (!ctx) return;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (shapeStart) {
      ctx.putImageData(shapeStart.snapshot, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      const sx = shapeStart.x, sy = shapeStart.y;
      if (tool === 'line') {
        ctx.moveTo(sx, sy);
        ctx.lineTo(x, y);
      } else if (tool === 'rect') {
        ctx.rect(sx, sy, x - sx, y - sy);
      } else if (tool === 'circle') {
        const rx = Math.abs(x - sx) / 2;
        const ry = Math.abs(y - sy) / 2;
        const cx = sx + (x - sx) / 2;
        const cy = sy + (y - sy) / 2;
        ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      } else if (tool === 'triangle') {
        const midX = (sx + x) / 2;
        ctx.moveTo(midX, sy);
        ctx.lineTo(x, y);
        ctx.lineTo(sx, y);
        ctx.closePath();
      }
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (tool === 'pan') {
      setIsPanning(false);
      return;
    }
    if (e) e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    setShapeStart(null);

    const ctx = contextRef.current;
    if (ctx) ctx.closePath();

    saveToHistory();
    if (onSave && canvasRef.current) {
      onSave(questionId, canvasRef.current.toDataURL());
    }
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    restoreFromHistory(history[newIndex]);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    restoreFromHistory(history[newIndex]);
  };

  const restoreFromHistory = (dataUrl) => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      if (onSave) onSave(questionId, canvas.toDataURL());
    };
    img.src = dataUrl;
  };

  const clearCanvas = () => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    if (onSave) onSave(questionId, canvas.toDataURL());
  };

  // Compute the text input overlay position (CSS pixels relative to container)
  const getTextOverlayStyle = () => {
    if (!textPos || !canvasRef.current || !containerRef.current) return { display: 'none' };
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const cssScaleX = container.clientWidth / canvas.width;
    const cssScaleY = CANVAS_DRAW_HEIGHT / canvas.height;
    return {
      position: 'absolute',
      left: textPos.x * cssScaleX,
      top: textPos.y * cssScaleY,
      zIndex: 10,
    };
  };

  const getCursorStyle = () => {
    if (tool === 'pan') return isPanning ? 'grabbing' : 'grab';
    if (tool === 'eraser') return 'cell';
    if (tool === 'text') return 'text';
    return 'crosshair';
  };

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        mt: 2, 
        overflow: 'hidden', 
        border: '1px solid #c0c0c0',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: containerHeight,
        transition: 'height 0.2s ease-in-out'
      }}
    >
      {/* Toolbar */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        px: 1.5, 
        py: 0.75, 
        bgcolor: '#f5f5f5', 
        borderBottom: '1px solid #e0e0e0',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        minHeight: 40,
        flexShrink: 0
      }}>
        <Typography variant="caption" fontWeight="bold" sx={{ mr: 0.5, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
          ✏️ Whiteboard
        </Typography>

        <Divider orientation="vertical" flexItem />

        {/* Tool selection */}
        <ToggleButtonGroup
          value={tool}
          exclusive
          onChange={(e, val) => { 
            if (val) {
              // Commit any open text before switching tools
              if (tool === 'text' && textPos) commitText();
              setTool(val); 
            }
          }}
          size="small"
          sx={{ '& .MuiToggleButton-root': { p: '4px 6px', border: 'none' } }}
        >
          <ToggleButton value="pan">
            <Tooltip title="Pan / Scroll Page"><PanToolIcon sx={{ fontSize: 18 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="pen">
            <Tooltip title="Pen"><CreateIcon sx={{ fontSize: 18 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="eraser">
            <Tooltip title="Eraser"><AutoFixHighIcon sx={{ fontSize: 18 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="text">
            <Tooltip title="Text"><TextFieldsIcon sx={{ fontSize: 18 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="line">
            <Tooltip title="Line"><HorizontalRuleIcon sx={{ fontSize: 18 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="rect">
            <Tooltip title="Rectangle"><CropSquareIcon sx={{ fontSize: 18 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="circle">
            <Tooltip title="Circle / Ellipse"><RadioButtonUncheckedIcon sx={{ fontSize: 18 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="triangle">
            <Tooltip title="Triangle"><ChangeHistoryIcon sx={{ fontSize: 18 }} /></Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Color palette */}
        <Box sx={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
          {COLORS.map(c => (
            <Box
              key={c}
              onClick={() => { setColor(c); if (tool === 'eraser' || tool === 'pan') setTool('pen'); }}
              sx={{
                width: 16,
                height: 16,
                bgcolor: c,
                borderRadius: '50%',
                border: color === c ? '2.5px solid #1976d2' : '1px solid #999',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'transform 0.1s',
                '&:hover': { transform: 'scale(1.3)' }
              }}
            />
          ))}
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Line width / Font size */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, minWidth: 90 }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
            {tool === 'text' ? 'Font' : 'Size'}
          </Typography>
          <Slider
            value={tool === 'text' ? fontSize : lineWidth}
            onChange={(e, v) => tool === 'text' ? setFontSize(v) : setLineWidth(v)}
            min={tool === 'text' ? 10 : 1}
            max={tool === 'text' ? 48 : 12}
            size="small"
            sx={{ width: 55 }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 16, textAlign: 'center' }}>
            {tool === 'text' ? fontSize : lineWidth}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Actions */}
        <Tooltip title="Undo">
          <span>
            <IconButton size="small" onClick={undo} disabled={historyIndex <= 0}>
              <UndoIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo">
          <span>
            <IconButton size="small" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <RedoIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Clear All">
          <IconButton size="small" onClick={clearCanvas} color="error">
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />
        <Typography 
          variant="caption" 
          sx={{ cursor: 'pointer', color: 'primary.main', userSelect: 'none', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
          onClick={() => setIsExpanded(p => !p)}
        >
          {isExpanded ? '▲ Collapse' : '▼ Expand'}
        </Typography>
      </Box>

      {/* Canvas Area */}
      <Box 
        ref={containerRef} 
        sx={{ 
          bgcolor: '#fff', 
          cursor: getCursorStyle(),
          width: '100%',
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ 
            display: 'block', 
            width: '100%', 
            height: `${CANVAS_DRAW_HEIGHT}px`,
            touchAction: tool === 'pan' ? 'auto' : 'none',
            border: 'none'
          }}
        />

        {/* Text input overlay */}
        {textMode && textPos && (
          <Box style={getTextOverlayStyle()}>
            <textarea
              ref={textInputRef}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setTextPos(null);
                  setTextValue('');
                  setTextMode(false);
                }
                // Enter without shift commits text
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  commitText();
                }
              }}
              onBlur={() => {
                // Delay to allow button clicks
                setTimeout(() => commitText(), 150);
              }}
              placeholder="Type here..."
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: `${fontSize * (containerRef.current ? containerRef.current.clientWidth / canvasRef.current.width : 1)}px`,
                color: color,
                background: 'rgba(255,255,255,0.85)',
                border: '1.5px dashed #1976d2',
                borderRadius: 4,
                padding: '4px 6px',
                outline: 'none',
                minWidth: 120,
                minHeight: 28,
                resize: 'both',
                lineHeight: 1.3,
                zIndex: 20,
              }}
              autoFocus
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default Whiteboard;
