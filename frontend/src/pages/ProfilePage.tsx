import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { User, Post } from '../types';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { resolveImageUrl } from '../utils';

const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: userData } = await api.get(`/api/users/${id}`);
        setProfileUser(userData);

        const { data: postsData } = await api.get(`/api/posts?limit=50&author=${id}`);
        setPosts(postsData.posts || []);
      } catch {
        setError('User not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error || !profileUser) return (
    <div className="container"><div className="error-message">{error || 'User not found'}</div></div>
  );

  return (
    <div className="container">
      <div className="card">
        <div className="profile-header">
          <img
            src={resolveImageUrl(profileUser.profileImage) || '/default-avatar.svg'}
            alt={profileUser.username}
            className="profile-image"
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.svg'; }}
          />
          <h2 className="profile-username">{profileUser.username}</h2>
          <p className="profile-email">{profileUser.email}</p>
          {profileUser.createdAt && (
            <p className="profile-meta">
              Member since {new Date(profileUser.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="profile-posts">
          <h3>{profileUser.username}'s Posts</h3>
          {posts.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', padding: '12px 0' }}>No posts yet</p>
          ) : (
            posts.map((post) => <PostCard key={post._id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
