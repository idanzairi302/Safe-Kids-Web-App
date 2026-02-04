import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';
import api from '../services/api';
import { User, Post } from '../types';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import ImageUpload from '../components/ImageUpload';
import LoadingSpinner from '../components/LoadingSpinner';
import { resolveImageUrl } from '../utils';

const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, updateUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const isOwnProfile = currentUser && currentUser._id === id;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: userData } = await api.get(`/api/users/${id}`);
        setProfileUser(userData);
        setEditUsername(userData.username);

        // Fetch posts filtered by author server-side
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('username', editUsername);
      if (editImage) formData.append('profileImage', editImage);
      await updateUser(formData);
      setProfileUser((prev) => prev ? { ...prev, username: editUsername } : prev);
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

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
          {editing ? (
            <div className="profile-edit-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  className="form-input"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Profile Image</label>
                <ImageUpload onFileSelect={setEditImage} label="Upload new profile image" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  <FiSave /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                  <FiX /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="profile-username">{profileUser.username}</h2>
              <p className="profile-email">{profileUser.email}</p>
              {profileUser.createdAt && (
                <p className="profile-meta">
                  Member since {new Date(profileUser.createdAt).toLocaleDateString()}
                </p>
              )}
              {isOwnProfile && (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>
                  <FiEdit2 /> Edit Profile
                </button>
              )}
            </>
          )}
        </div>

        <div className="profile-posts">
          <h3>{isOwnProfile ? 'Your Posts' : `${profileUser.username}'s Posts`}</h3>
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
