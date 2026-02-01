import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../services/api';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import LoadingSpinner from '../components/LoadingSpinner';
import { resolveImageUrl } from '../utils';

const EditPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await api.get(`/api/posts/${id}`);
        if (user && data.author && data.author._id !== user._id) {
          navigate('/');
          return;
        }
        setPost(data);
        setText(data.text);
      } catch {
        setError('Post not found');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!text.trim()) return setError('Please describe the hazard');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      if (image) formData.append('image', image);
      await api.put(`/api/posts/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/post/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!post) return <div className="container"><div className="error-message">Post not found</div></div>;

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <h2>Edit Post</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card" style={{ padding: 16 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-input"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the hazard..."
            />
          </div>
          <div className="form-group">
            <label>Photo (leave to keep current)</label>
            <ImageUpload
              onFileSelect={setImage}
              currentImage={resolveImageUrl(post.image)}
              label="Upload a new photo (optional)"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditPostPage;
