import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle } from 'react-icons/fi';
import { Post } from '../types';
import { resolveImageUrl } from '../utils';

interface PostCardProps {
  post: Post;
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

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const navigate = useNavigate();

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
        <p className="post-card-text truncated" onClick={() => navigate(`/post/${post._id}`)}>
          {post.text}
        </p>
      </div>

      <div className="post-card-actions">
        <span className="post-action-btn">
          <FiHeart className="icon" />
          {post.likesCount}
        </span>
        <Link to={`/post/${post._id}/comments`} className="post-action-btn">
          <FiMessageCircle className="icon" />
          {post.commentsCount}
        </Link>
      </div>
    </div>
  );
};

export default PostCard;
