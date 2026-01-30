import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../services/api';
import ImageUpload from '../components/ImageUpload';

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!text.trim()) return setError('Please describe the hazard');
    if (!image) return setError('Please upload an image');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      formData.append('image', image);
      await api.post('/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <h2>Report a Hazard</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card" style={{ padding: 16 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>What's the hazard?</label>
            <textarea
              className="form-input"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the hazard for other parents..."
            />
          </div>
          <div className="form-group">
            <label>Photo</label>
            <ImageUpload onFileSelect={setImage} label="Upload a photo of the hazard" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post Hazard Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePostPage;
