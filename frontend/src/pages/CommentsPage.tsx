import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';
import { Post, Comment } from '../types';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { resolveImageUrl } from '../utils';

const timeAgo = (dateStr: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
};

const CommentsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        api.get(`/api/posts/${id}`),
        api.get(`/api/posts/${id}/comments?limit=50`),
      ]);
      setPost(postRes.data);
      setComments(commentsRes.data.comments || []);
    } catch {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/api/posts/${id}/comments`, { text: text.trim() });
      setComments((prev) => [...prev, data]);
      setText('');
    } catch {
      setError('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.delete(`/api/posts/${id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {
      setError('Failed to delete comment');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <h2>Comments</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {post && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
          <Link to={`/post/${post._id}`} style={{ display: 'flex', gap: 12, textDecoration: 'none', color: 'inherit' }}>
            {post.image && (
              <img src={resolveImageUrl(post.image)} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
            )}
            <div>
              <strong>{post.author?.username}</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {post.text.length > 100 ? post.text.slice(0, 100) + '...' : post.text}
              </p>
            </div>
          </Link>
        </div>
      )}

      <div className="card" style={{ padding: '8px 16px' }}>
        {comments.length === 0 ? (
          <p style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No comments yet. Be the first!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="comment-card">
              <img
                src={resolveImageUrl(comment.author?.profileImage) || '/default-avatar.svg'}
                alt=""
                className="comment-avatar"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.svg'; }}
              />
              <div className="comment-body">
                <span className="comment-author">{comment.author?.username}</span>
                <span className="comment-time">{timeAgo(comment.createdAt)}</span>
                <p className="comment-text">{comment.text}</p>
              </div>
              {user && comment.author && user._id === comment.author._id && (
                <button className="comment-delete" onClick={() => handleDelete(comment._id)}>
                  <FiTrash2 />
                </button>
              )}
            </div>
          ))
        )}

        {user && (
          <form className="comment-form" onSubmit={handleSubmit}>
            <input
              className="form-input"
              placeholder="Write a comment..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !text.trim()}>
              <FiSend />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CommentsPage;
