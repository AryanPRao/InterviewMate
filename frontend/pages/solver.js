import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { FaRobot, FaLightbulb, FaComments, FaKey, FaPaperPlane, FaCheckCircle, FaRedo } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function GuidedSolver() {
  const router = useRouter();
  const [problemText, setProblemText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [userIdea, setUserIdea] = useState('');
  const [hintCount, setHintCount] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.push('/login');
    }
  }, []);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStart = async () => {
    if (!problemText.trim()) {
      alert('Please paste a problem statement first!');
      return;
    }

    setSessionStarted(true);
    setMessages([
      { role: 'system', content: '🧩 Session started. I\'ll help you understand and solve this problem step by step.' },
    ]);

    await sendToAI('explain');
  };

  const sendToAI = async (stage, idea = '') => {
    setLoading(true);
    try {
      // Prepare conversation history (exclude system messages)
      const history = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({ role: msg.role, content: msg.content }));

      const res = await axios.post('http://localhost:5000/api/solve-problem', {
        problem: problemText,
        stage,
        user_input: idea,
        conversation_history: history,  // Send full conversation context
      });
      const content = res.data.response || 'No response from AI.';
      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch (err) {
      console.error('Error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Something went wrong. Please check your backend or API key.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleHint = () => {
    setMessages((prev) => [...prev, { role: 'user', content: 'Can I have a hint?' }]);
    setHintCount(prev => prev + 1);
    sendToAI('hint');
  };

  const handleFeedback = async () => {
    if (!userIdea.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: `💡 My thought: ${userIdea}` }]);
    setUserIdea('');
    await sendToAI('feedback', userIdea);
  };

  const handleSolution = () => {
    setMessages((prev) => [...prev, { role: 'user', content: 'Please show me the complete solution.' }]);
    sendToAI('solution');
  };

  const handleReset = () => {
    setSessionStarted(false);
    setMessages([]);
    setProblemText('');
    setUserIdea('');
    setHintCount(0);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFeedback();
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      
      <div className="container mt-5 mb-5">
        <div className="text-center mb-5">
          <h1 style={{ color: 'white', fontWeight: 'bold' }}>🧠 Guided Problem Solver</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)' }}>
            Paste a coding problem and let the AI mentor help you understand and solve it step by step
          </p>
        </div>

        {!sessionStarted ? (
          <div className="card shadow-lg">
            <div className="card-body p-5">
              <h4 className="mb-4">
                <FaRobot className="me-2 text-primary" />
                Enter Problem Statement
              </h4>
              <textarea
                className="form-control mb-4"
                rows="12"
                placeholder="Paste the full problem here:&#10;&#10;Title: Two Sum&#10;&#10;Description: Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.&#10;&#10;Example 1:&#10;Input: nums = [2,7,11,15], target = 9&#10;Output: [0,1]&#10;&#10;Constraints:&#10;- 2 <= nums.length <= 10^4&#10;- -10^9 <= nums[i] <= 10^9"
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                style={{ fontSize: '0.95rem', fontFamily: 'monospace' }}
              />
              <div className="d-flex gap-2">
                <button className="btn btn-primary btn-lg flex-grow-1" onClick={handleStart}>
                  <FaRobot className="me-2" />
                  Start Guided Session
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card shadow-lg">
            <div className="card-body p-4" style={{ backgroundColor: '#f8f9fa' }}>
              {/* Chat Area */}
              <div
                style={{
                  height: '55vh',
                  overflowY: 'auto',
                  padding: '1.5rem',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #dee2e6',
                  marginBottom: '1.5rem'
                }}
              >
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${
                      msg.role === 'assistant' 
                        ? 'text-start' 
                        : msg.role === 'system' 
                        ? 'text-center' 
                        : 'text-end'
                    }`}
                  >
                    <div className="d-inline-block text-start" style={{ maxWidth: '85%' }}>
                      <div className="fw-bold mb-2" style={{ fontSize: '0.9rem' }}>
                        {msg.role === 'assistant' && (
                          <span className="text-success">
                            <FaRobot className="me-1" /> AI Mentor
                          </span>
                        )}
                        {msg.role === 'user' && (
                          <span className="text-primary">
                            <FaComments className="me-1" /> You
                          </span>
                        )}
                        {msg.role === 'system' && (
                          <span className="text-secondary">
                            <FaKey className="me-1" /> System
                          </span>
                        )}
                      </div>
                      <div 
                        className={`p-3 rounded ${
                          msg.role === 'assistant' 
                            ? 'bg-light border' 
                            : msg.role === 'user'
                            ? 'bg-primary bg-opacity-10 border border-primary'
                            : 'bg-secondary bg-opacity-10'
                        }`}
                        style={{ wordWrap: 'break-word' }}
                      >
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({node, inline, ...props}) => 
                              inline ? (
                                <code style={{ 
                                  background: '#f8f9fa', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px',
                                  fontSize: '0.9em'
                                }} {...props} />
                              ) : (
                                <code style={{ 
                                  display: 'block',
                                  background: '#f8f9fa', 
                                  padding: '12px', 
                                  borderRadius: '6px',
                                  overflow: 'auto',
                                  fontSize: '0.85em'
                                }} {...props} />
                              )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="text-center text-muted">
                    <div className="spinner-border spinner-border-sm me-2" />
                    AI is thinking...
                  </div>
                )}
                <div ref={chatEndRef}></div>
              </div>

              {/* Interaction Buttons */}
              <div className="mb-3 d-flex flex-wrap gap-2 align-items-center">
                <button 
                  className="btn btn-outline-warning" 
                  onClick={handleHint} 
                  disabled={loading}
                >
                  <FaLightbulb className="me-2" />
                  Get Hint
                  {hintCount > 0 && (
                    <span className="badge bg-warning text-dark ms-2">{hintCount}</span>
                  )}
                </button>
                {hintCount > 0 && (
                  <small className="text-muted">
                    {hintCount === 1 && '(Next hint will be more specific)'}
                    {hintCount === 2 && '(Next hint will be very direct)'}
                    {hintCount >= 3 && '(Final hints - almost complete approach)'}
                  </small>
                )}
                <button 
                  className="btn btn-outline-success" 
                  onClick={handleSolution} 
                  disabled={loading}
                >
                  <FaCheckCircle className="me-2" />
                  Reveal Solution
                </button>
                <button 
                  className="btn btn-outline-secondary ms-auto" 
                  onClick={handleReset}
                >
                  <FaRedo className="me-2" />
                  New Problem
                </button>
              </div>

              {/* Idea Input */}
              <div className="mb-3">
                <label className="form-label fw-bold">
                  <FaComments className="me-2" />
                  Share your thought or approach
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., I think we need to use a hash map to store seen values..."
                    value={userIdea}
                    onChange={(e) => setUserIdea(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleFeedback}
                    disabled={!userIdea.trim() || loading}
                  >
                    <FaPaperPlane />
                  </button>
                </div>
                <small className="text-muted">Press Enter to send</small>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}