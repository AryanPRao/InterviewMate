import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { FaClipboardList, FaChartLine, FaFileUpload, FaTrophy, FaRobot } from 'react-icons/fa';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Check authentication
    const userId = localStorage.getItem('user_id');
    const name = localStorage.getItem('user_name');
    
    if (!userId) {
      router.push('/login');
    } else {
      setUserName(name);
    }
  }, []);

  const features = [
    {
      icon: <FaClipboardList />,
      title: 'Problem Tracker',
      description: 'Log and organize your coding problems by difficulty, topic, and track your progress systematically.',
      link: '/tracker',
      color: '#667eea'
    },
    {
      icon: <FaRobot />,
      title: 'AI Problem Solver',
      description: 'Get step-by-step guidance from AI mentor. Get hints, share ideas, and understand problems deeply.',
      link: '/solver',
      color: '#9333ea'
    },
    {
      icon: <FaChartLine />,
      title: 'Analytics Dashboard',
      description: 'Visualize your progress with beautiful charts showing problems solved by difficulty, topic, and points earned.',
      link: '/dashboard',
      color: '#f56565'
    },
    {
      icon: <FaFileUpload />,
      title: 'Resume Upload',
      description: 'Upload your resume to AWS S3 and get AI-powered feedback to optimize it for technical interviews.',
      link: '/upload',
      color: '#48bb78'
    }
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      
      <div className="container-custom">
        <div className="page-header fade-in-up">
          <h1 className="page-title">
            Welcome to InterviewMate 🎯
          </h1>
          <p className="page-subtitle">
            Your complete platform for technical interview preparation
          </p>
        </div>

        <div className="row g-4 mb-5">
          {features.map((feature, index) => (
            <div key={index} className="col-md-6 col-lg-3 fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <div 
                className="feature-card h-100"
                onClick={() => router.push(feature.link)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-icon" style={{ color: feature.color }}>
                  {feature.icon}
                </div>
                <h3 className="card-title">{feature.title}</h3>
                <p className="card-text">{feature.description}</p>
                <button className="btn btn-primary-custom">
                  Get Started →
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4 mb-5">
          <div className="col-md-6 fade-in-up">
            <div className="feature-card">
              <h3 className="card-title">🚀 Quick Stats</h3>
              <p className="card-text mb-4">
                Track your progress and stay motivated with real-time statistics
              </p>
              <div className="row text-center">
                <div className="col-4">
                  <div style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '1.5rem',
                    borderRadius: '15px',
                    color: 'white'
                  }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>0</h2>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Problems</p>
                  </div>
                </div>
                <div className="col-4">
                  <div style={{ 
                    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                    padding: '1.5rem',
                    borderRadius: '15px',
                    color: 'white'
                  }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>0</h2>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Points</p>
                  </div>
                </div>
                <div className="col-4">
                  <div style={{ 
                    background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
                    padding: '1.5rem',
                    borderRadius: '15px',
                    color: 'white'
                  }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>0</h2>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Streak</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="feature-card">
              <h3 className="card-title">💡 Pro Tips</h3>
              <ul style={{ color: '#718096', fontSize: '1.05rem', lineHeight: 1.8 }}>
                <li>Start with Easy problems to build confidence</li>
                <li>Focus on understanding patterns, not memorizing</li>
                <li>Practice consistently - even 1 problem daily helps</li>
                <li>Review your solutions and optimize them</li>
                <li>Track topics you're weak in and improve them</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center mb-5 fade-in-up">
          <div className="feature-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 className="card-title">🎓 How InterviewMate Works</h3>
            <div className="row mt-4">
              <div className="col-md-3 mb-3">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
                <h5 style={{ fontWeight: 600 }}>Track</h5>
                <p style={{ fontSize: '0.9rem', color: '#718096' }}>
                  Log every problem you solve
                </p>
              </div>
              <div className="col-md-3 mb-3">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
                <h5 style={{ fontWeight: 600 }}>Analyze</h5>
                <p style={{ fontSize: '0.9rem', color: '#718096' }}>
                  Review your progress
                </p>
              </div>
              <div className="col-md-3 mb-3">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
                <h5 style={{ fontWeight: 600 }}>Improve</h5>
                <p style={{ fontSize: '0.9rem', color: '#718096' }}>
                  Focus on weak areas
                </p>
              </div>
              <div className="col-md-3 mb-3">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
                <h5 style={{ fontWeight: 600 }}>Succeed</h5>
                <p style={{ fontSize: '0.9rem', color: '#718096' }}>
                  Ace your interviews
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}