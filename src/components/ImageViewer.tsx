/**
 * ImageViewer
 * Fullscreen lightbox with zoom/pan and keyboard navigation.
 * Parent provides image list and current index; runs in a modal context via portal.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ImageViewer.css';

interface ImageViewerProps {
  isOpen: boolean;
  images: { url: string; name: string }[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ 
  isOpen, 
  images, 
  currentIndex, 
  onClose, 
  onIndexChange 
}) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Allow click outside content to close without extra UI
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enhanced navigation: keyboard shortcuts improve accessibility and workflow efficiency
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      onIndexChange(currentIndex - 1);
      resetZoom();
    } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
      onIndexChange(currentIndex + 1);
      resetZoom();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      handleZoomIn();
    } else if (e.key === '-') {
      e.preventDefault();
      handleZoomOut();
    } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      resetZoom();
    }
  };

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => { setZoom(prev => Math.min(prev * 1.2, 5)); };
  const handleZoomOut = () => { setZoom(prev => Math.max(prev / 1.2, 0.25)); };

  // Drag only when zoomed; avoids accidental drags at 1x
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom !== 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom !== 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      // Free movement without boundary constraints for flexible image positioning
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => { setIsDragging(false); };

  // Zoom around mouse position for intuitive control
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(zoom * delta, 5));
    if (newZoom !== zoom) {
      const zoomDiff = newZoom / zoom;
      setPosition(prev => ({ x: prev.x + mouseX * (1 - zoomDiff), y: prev.y + mouseY * (1 - zoomDiff) }));
      setZoom(newZoom);
    }
  };

  useEffect(() => { resetZoom(); }, [currentIndex]);

  if (!isOpen || images.length === 0) return null;

  // Use portal to escape stacking contexts and ensure fullscreen overlay
  return createPortal(
    <div 
      className="image-viewer-overlay fullscreen" 
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="image-viewer-container fullscreen">
        <div className="image-viewer-header">
          <div className="image-viewer-info">
            <span className="image-viewer-title">{currentImage.name}</span>
            {images.length > 1 && (
              <span className="image-viewer-counter">{currentIndex + 1} of {images.length}</span>
            )}
          </div>
          <div className="image-viewer-controls">
            <button className="cf-btn cf-btn--secondary cf-btn--small" onClick={handleZoomOut} disabled={zoom <= 0.25}>−</button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button className="cf-btn cf-btn--secondary cf-btn--small" onClick={handleZoomIn} disabled={zoom >= 5}>+</button>
            <button className="cf-btn cf-btn--secondary cf-btn--small" onClick={resetZoom}>Reset</button>
            <button className="cf-btn cf-btn--secondary cf-btn--small" onClick={onClose}>Close</button>
          </div>
        </div>
        
        <div className="image-viewer-content fullscreen">
          <div 
            className="image-container"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: zoom !== 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <img 
              src={currentImage.url} 
              alt={currentImage.name}
              className="image-viewer-image fullscreen"
              style={{
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease',
                willChange: isDragging ? 'transform' : 'auto'
              }}
              draggable={false}
              loading="lazy"
            />
          </div>
        </div>
        
        <div className="image-viewer-footer">
          <span className="image-viewer-hint">
            {images.length > 1 ? 'Use ← → keys to navigate • ' : ''}
            Scroll, +/- to zoom • Drag to pan when zoomed • R to reset • ESC to close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageViewer;
