import React, { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import api from '../services/api';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';

const EXAMPLE_QUERIES = ['playground hazards', 'dangerous animals', 'dark areas', 'broken equipment'];

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (q?: string) => {
    const searchQuery = (q || query).trim();
    if (!searchQuery) return;
    setQuery(searchQuery);
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const { data } = await api.post('/api/search', { query: searchQuery });
      setResults(data.posts || []);
      setFallback(!!data.fallback);
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

      {!searched && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Try searching for:</p>
          <div className="search-examples">
            {EXAMPLE_QUERIES.map((q) => (
              <button key={q} className="search-chip" onClick={() => handleSearch(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <LoadingSpinner />}

      {error && <div className="error-message">{error}</div>}

      {!loading && searched && (
        <>
          {fallback && (
            <div className="fallback-notice">
              AI search is currently unavailable. Showing text search results instead.
            </div>
          )}
          {results.length === 0 ? (
            <div className="empty-state">
              <p>No results found for "{query}"</p>
              <p style={{ fontSize: '0.85rem' }}>Try different keywords or a broader search</p>
            </div>
          ) : (
            results.map((post) => <PostCard key={post._id} post={post} />)
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;
