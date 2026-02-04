import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle } from 'react-icons/fi';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { resolveImageUrl } from '../utils';

interface PostCardProps {
  post: Post;
  onLike?: (postId: string, liked: boolean, count: number) => void;
  truncate?: boolean;
}

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

const PostCard: React.FC<PostCardProps> = ({ post, onLike, truncate = true }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.get(`/api/posts/${post._id}/like`).then(({ data }) => {
      if (!cancelled) setLiked(data.liked);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [post._id, user]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return navigate('/login');
    try {
      const { data } = await api.post(`/api/posts/${post._id}/like`);
      setLiked(data.liked);
      setLikesCount(data.likesCount);
      onLike?.(post._id, data.liked, data.likesCount);
    } catch {}
  };

  const authorImage = resolveImageUrl(post.author?.profileImage);
  const postImage = resolveImageUrl(post.image);

  return (
    <div className="post-card">
      <div className="post-card-header">
        <Link to={`/profile/${post.author?._id}`}>
          <img src={authorImage || '/default-avatar.svg'} alt="" className="post-card-avatar" onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.svg'; }} />
          <div>
            <div className="post-card-author">{post.author?.username || 'Unknown'}</div>
            <div className="post-card-time">{timeAgo(post.createdAt)}</div>
          </div>
        </Link>
      </div>

      {postImage && (
        <img
          src={postImage}
          alt="Post"
          className="post-card-image"
          onClick={() => navigate(`/post/${post._id}`)}
        />
      )}

      <div className="post-card-body">
        <p
          className={`post-card-text ${truncate ? 'truncated' : ''}`}
          onClick={() => navigate(`/post/${post._id}`)}
        >
          {post.text}
        </p>
      </div>

      <div className="post-card-actions">
        <button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
          <FiHeart className="icon" style={liked ? { fill: 'currentColor' } : {}} />
          {likesCount}
        </button>
        <Link to={`/post/${post._id}/comments`} className="post-action-btn">
          <FiMessageCircle className="icon" />
          {post.commentsCount}
        </Link>
      </div>
    </div>
  );
};

export default PostCard;
