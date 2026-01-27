import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiSearch, FiPlusCircle, FiUser, FiLogOut, FiLogIn } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        SafeKids
      </Link>
      <div className="navbar-links">
        <Link to="/" className={isActive('/')}>
          <FiHome /> <span>Feed</span>
        </Link>
        {user ? (
          <>
            <Link to="/search" className={isActive('/search')}>
              <FiSearch /> <span>Search</span>
            </Link>
            <Link to="/post/new" className={isActive('/post/new')}>
              <FiPlusCircle /> <span>Post</span>
            </Link>
            <Link to={`/profile/${user._id}`} className={location.pathname.startsWith('/profile') ? 'active' : ''}>
              <FiUser />
              <span>Profile</span>
            </Link>
            <button onClick={logout}>
              <FiLogOut /> <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={isActive('/login')}>
              <FiLogIn /> <span>Login</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
