import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiMessageCircle } from 'react-icons/fi';
import api from '../services/api';
import { Post } from '../types';
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
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await api.get(`/api/posts/${id}`);
        setPost(data);
      } catch {
        setError('Post not found');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error || !post) return (
    <div className="container">
      <div className="error-message">{error || 'Post not found'}</div>
    </div>
  );

  return (
    <div className="container post-detail">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
      </div>

      <div className="card" style={{ padding: '16px' }}>
        <div className="post-card-header">
          <Link to={`/profile/${post.author?._id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <img src={resolveImageUrl(post.author?.profileImage) || '/default-avatar.svg'} alt="" className="post-card-avatar" onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.svg'; }} />
            <div>
              <div className="post-card-author">{post.author?.username}</div>
              <div className="post-card-time">{timeAgo(post.createdAt)}</div>
            </div>
          </Link>
        </div>

        {post.image && (
          <img src={resolveImageUrl(post.image)} alt="Post" className="post-detail-image" />
        )}

        <p className="post-detail-text">{post.text}</p>

        <div className="post-detail-meta">
          <div className="post-card-actions" style={{ padding: 0 }}>
            <Link to={`/post/${post._id}/comments`} className="post-action-btn">
              <FiMessageCircle className="icon" />
              {post.commentsCount} Comments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;
