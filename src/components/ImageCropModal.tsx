/**
 * ImageCropModal
 * Allow users to crop uploaded images before setting them as profile pictures.
 * Uses react-easy-crop for smooth cropping experience.
 */
import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import './ImageCropModal.css';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onClose: () => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onCropComplete,
  onClose
}) => {
  const { t } = useTranslation(['clients', 'common']);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to match the crop area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Convert canvas to base64
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleCropSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="image-crop-modal-overlay" onClick={handleCancel}>
      <div className="image-crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="image-crop-header">
          <h2>{t('clients:cropImage')}</h2>
        </div>

        <div className="crop-container">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
          />
        </div>

        <div className="crop-controls">
          <div className="zoom-control">
            <label>{t('clients:zoom')}</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="image-crop-actions">
          <button 
            type="button"
            className="cf-btn cf-btn--secondary" 
            onClick={handleCancel}
          >
            {t('common:buttons.cancel')}
          </button>
          <button 
            type="button"
            className="cf-btn cf-btn--primary" 
            onClick={handleCropSave}
          >
            {t('clients:applyCrop')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageCropModal;
