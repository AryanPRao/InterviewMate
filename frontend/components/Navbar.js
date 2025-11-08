import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const userId = localStorage.getItem('user_id');
    const name = localStorage.getItem('user_name');
    
    if (userId && name) {
      setUserName(name);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [router.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    router.push('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-custom">
      <div className="container-fluid">
        <Link href="/" className="navbar-brand">
          🎯 InterviewMate
        </Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <Link href="/" className="nav-link">Home</Link>
                </li>
                <li className="nav-item">
                  <Link href="/tracker" className="nav-link">Tracker</Link>
                </li>
                <li className="nav-item">
                  <Link href="/dashboard" className="nav-link">Dashboard</Link>
                </li>
                <li className="nav-item">
                  <Link href="/solver" className="nav-link">AI Solver</Link>
                </li>
                <li className="nav-item">
                  <Link href="/upload" className="nav-link">Resume</Link>
                </li>
                <li className="nav-item">
                  <span className="user-greeting">Hi, {userName}!</span>
                </li>
                <li className="nav-item">
                  <button className="btn btn-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link href="/login" className="nav-link">Login</Link>
                </li>
                <li className="nav-item">
                  <Link href="/register" className="nav-link">Register</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}