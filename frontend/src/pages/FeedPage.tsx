import React, { useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiPlusCircle } from 'react-icons/fi';
import api from '../services/api';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = useCallback(async (cursorParam?: string | null) => {
    try {
      const params: Record<string, string> = { limit: '10' };
      if (cursorParam) params.cursor = cursorParam;
      const { data } = await api.get('/api/posts', { params });
      const newPosts: Post[] = data.posts || [];
      setPosts((prev) => cursorParam ? [...prev, ...newPosts] : newPosts);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const loadMore = () => {
    if (cursor) fetchPosts(cursor);
  };

  if (loading) return <LoadingSpinner />;

  if (error) return (
    <div className="container">
      <div className="error-message">{error}</div>
    </div>
  );

  if (posts.length === 0) return (
    <div className="container">
      <div className="empty-state">
        <div className="icon"><FiAlertTriangle /></div>
        <p>No hazard reports yet. Be the first to help keep kids safe!</p>
        <Link to="/post/new" className="btn btn-primary">
          <FiPlusCircle /> Create First Post
        </Link>
      </div>
    </div>
  );

  return (
    <div className="container">
      <InfiniteScroll
        dataLength={posts.length}
        next={loadMore}
        hasMore={hasMore}
        loader={<LoadingSpinner />}
        endMessage={<p className="scroll-end">You're all caught up!</p>}
      >
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default FeedPage;
