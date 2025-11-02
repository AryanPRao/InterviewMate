import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function Tracker() {
  const router = useRouter();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [formData, setFormData] = useState({
    number: '',
    name: '',
    difficulty: 'Easy',
    topic: '',
    summary: ''
  });

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.push('/login');
    } else {
      fetchProblems();
    }
  }, []);

  const fetchProblems = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await axios.get(`http://localhost:5000/api/problems?user_id=${userId}`);
      setProblems(response.data);
    } catch (error) {
      console.error('Error fetching problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('user_id');

    try {
      if (editingProblem) {
        // Update existing problem
        await axios.put(`http://localhost:5000/api/problems/${editingProblem.id}`, formData);
      } else {
        // Add new problem
        await axios.post('http://localhost:5000/api/problems', {
          ...formData,
          user_id: userId
        });
      }

      // Reset form and refresh
      setFormData({
        number: '',
        name: '',
        difficulty: 'Easy',
        topic: '',
        summary: ''
      });
      setEditingProblem(null);
      setShowModal(false);
      fetchProblems();
    } catch (error) {
      console.error('Error saving problem:', error);
      alert('Failed to save problem. Please try again.');
    }
  };

  const handleEdit = (problem) => {
    setEditingProblem(problem);
    setFormData({
      number: problem.number,
      name: problem.name,
      difficulty: problem.difficulty,
      topic: problem.topic,
      summary: problem.summary || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (problemId) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/problems/${problemId}`);
      fetchProblems();
    } catch (error) {
      console.error('Error deleting problem:', error);
      alert('Failed to delete problem. Please try again.');
    }
  };

  const getDifficultyBadge = (difficulty) => {
    const classes = {
      Easy: 'badge-easy',
      Medium: 'badge-medium',
      Hard: 'badge-hard'
    };
    return <span className={`badge ${classes[difficulty]}`}>{difficulty}</span>;
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      
      <div className="container-custom">
        <div className="page-header fade-in-up">
          <h1 className="page-title">Problem Tracker 📝</h1>
          <p className="page-subtitle">Keep track of all your coding problems</p>
        </div>

        <div className="mb-4 fade-in-up">
          <button 
            className="btn btn-primary-custom"
            onClick={() => {
              setEditingProblem(null);
              setFormData({
                number: '',
                name: '',
                difficulty: 'Easy',
                topic: '',
                summary: ''
              });
              setShowModal(true);
            }}
          >
            <FaPlus style={{ marginRight: '0.5rem' }} />
            Add New Problem
          </button>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="spinner-custom"></div>
          </div>
        ) : problems.length === 0 ? (
          <div className="feature-card text-center fade-in-up">
            <h3 className="card-title">No Problems Yet 🎯</h3>
            <p className="card-text">Start by adding your first coding problem!</p>
          </div>
        ) : (
          <div className="table-responsive fade-in-up">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Problem Name</th>
                  <th>Difficulty</th>
                  <th>Topic</th>
                  <th>Points</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => (
                  <tr key={problem.id}>
                    <td><strong>{problem.number}</strong></td>
                    <td>{problem.name}</td>
                    <td>{getDifficultyBadge(problem.difficulty)}</td>
                    <td>
                      <span style={{ 
                        background: 'rgba(102, 126, 234, 0.1)',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '15px',
                        fontSize: '0.9rem',
                        fontWeight: 500
                      }}>
                        {problem.topic}
                      </span>
                    </td>
                    <td><strong>{problem.points}</strong></td>
                    <td>{new Date(problem.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary-custom me-2"
                        onClick={() => handleEdit(problem)}
                        style={{ padding: '0.4rem 0.8rem' }}
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="btn btn-sm"
                        onClick={() => handleDelete(problem.id)}
                        style={{ 
                          background: 'linear-gradient(135deg, #f56565, #e53e3e)',
                          color: 'white',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '8px'
                        }}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '20px', border: 'none' }}>
              <div className="modal-header" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '20px 20px 0 0'
              }}>
                <h5 className="modal-title">
                  {editingProblem ? 'Edit Problem' : 'Add New Problem'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '2rem' }}>
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label-custom">Problem Number</label>
                    <input
                      type="text"
                      name="number"
                      className="form-control form-control-custom"
                      placeholder="e.g., LC-1"
                      value={formData.number}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">Problem Name</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control form-control-custom"
                      placeholder="e.g., Two Sum"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">Difficulty</label>
                    <select
                      name="difficulty"
                      className="form-control form-control-custom"
                      value={formData.difficulty}
                      onChange={handleChange}
                      required
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">Topic</label>
                    <input
                      type="text"
                      name="topic"
                      className="form-control form-control-custom"
                      placeholder="e.g., Arrays, Dynamic Programming"
                      value={formData.topic}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">Summary (Optional)</label>
                    <textarea
                      name="summary"
                      className="form-control form-control-custom"
                      rows="3"
                      placeholder="Brief notes about the problem..."
                      value={formData.summary}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary-custom flex-grow-1">
                      {editingProblem ? 'Update Problem' : 'Add Problem'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary-custom"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}