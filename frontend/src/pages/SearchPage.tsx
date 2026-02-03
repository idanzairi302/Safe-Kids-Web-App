import React, { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import api from '../services/api';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const searchQuery = query.trim();
    if (!searchQuery) return;
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const { data } = await api.post('/api/search', { query: searchQuery });
      setResults(data.posts || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="container search-page">
      <div className="search-heading">
        <h2>Ask SafeKids</h2>
        <p>Search for hazards in your area using natural language</p>
      </div>

      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          className="form-input"
          placeholder="Describe what you're looking for..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
          <FiSearch />
        </button>
      </form>

      {loading && <LoadingSpinner />}

      {error && <div className="error-message">{error}</div>}

      {!loading && searched && (
        results.length === 0 ? (
          <div className="empty-state">
            <p>No results found for "{query}"</p>
          </div>
        ) : (
          results.map((post) => <PostCard key={post._id} post={post} />)
        )
      )}
    </div>
  );
};

export default SearchPage;
