import React, { useState, useRef } from 'react';
import { FiUploadCloud } from 'react-icons/fi';

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  currentImage?: string;
  label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onFileSelect, currentImage, label }) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="image-upload" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
      />
      {preview ? (
        <img src={preview} alt="Preview" className="image-upload-preview" />
      ) : (
        <div className="image-upload-text">
          <div className="icon"><FiUploadCloud /></div>
          <p>{label || 'Click to upload an image'}</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
