import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { FaFileUpload, FaFilePdf, FaDownload } from 'react-icons/fa';

export default function Upload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.push('/login');
    } else {
      fetchResumes();
    }
  }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('user_id');
      const response = await axios.get(`http://localhost:5000/api/resumes?user_id=${userId}`);
      setResumes(response.data);
    } catch (error) {
      console.error('Error fetching resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadSuccess(false);

    try {
      const userId = localStorage.getItem('user_id');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('user_id', userId);

      await axios.post('http://localhost:5000/api/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadSuccess(true);
      setSelectedFile(null);
      // Reset file input
      document.getElementById('fileInput').value = '';
      // Refresh resume list
      fetchResumes();

      // Hide success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error('Error uploading resume:', error);
      alert('Failed to upload resume. Please check your AWS configuration and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      
      <div className="container mt-5">
        <div className="text-center mb-5">
          <h1 style={{ color: 'white', fontWeight: 'bold' }}>Resume Upload 📄</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)' }}>Upload and manage your resumes securely on AWS S3</p>
        </div>

        {/* Upload Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow">
              <div className="card-body p-4">
                <h3 className="mb-3">Upload New Resume</h3>
                <p className="text-muted mb-4">
                  Upload your resume in PDF format (max 5MB). Your file will be securely stored on AWS S3.
                </p>

                {uploadSuccess && (
                  <div className="alert alert-success mb-4">
                    ✅ Resume uploaded successfully!
                  </div>
                )}

                <div className="mb-4">
                  <input
                    type="file"
                    id="fileInput"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="form-control"
                  />
                  {selectedFile && (
                    <div className="mt-2">
                      <span style={{ color: '#667eea', fontWeight: 600 }}>
                        📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                  )}
                </div>

                <button 
                  className="btn btn-primary"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  style={{ pointerEvents: 'auto' }}
                >
                  {uploading ? 'Uploading...' : 'Upload to AWS S3'}
                </button>

                <div className="mt-4 p-3 bg-light rounded border-start border-primary border-4">
                  <h5 className="fw-bold mb-2">💡 Optional: AI Resume Analysis</h5>
                  <p className="text-muted mb-1">
                    To enable AI-powered resume feedback using Google's Gemini API:
                  </p>
                  <ul className="text-muted mb-0">
                    <li>Add your GEMINI_API_KEY to the backend .env file</li>
                    <li>Implement the analysis endpoint in app.py</li>
                    <li>Get suggestions on formatting, keywords, and content improvements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Uploaded Resumes List */}
        <div className="row mb-5">
          <div className="col-12">
            <div className="card shadow">
              <div className="card-body p-4">
                <h3 className="mb-3">Your Uploaded Resumes</h3>
                
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : resumes.length === 0 ? (
                  <div className="text-center py-5">
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
                    <p className="text-muted">No resumes uploaded yet</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Filename</th>
                          <th>Upload Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumes.map((resume) => (
                          <tr key={resume.id}>
                            <td>
                              <FaFilePdf style={{ color: '#f56565', marginRight: '0.5rem' }} />
                              <strong>{resume.filename}</strong>
                            </td>
                            <td>{new Date(resume.uploaded_at).toLocaleString()}</td>
                            <td>
                              <a 
                                href={resume.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-primary"
                              >
                                <FaDownload style={{ marginRight: '0.3rem' }} />
                                Download
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AWS S3 Info */}
        <div className="row mb-5">
          <div className="col-md-6 mb-3">
            <div className="card shadow h-100">
              <div className="card-body">
                <h5 className="card-title">☁️ Secure Cloud Storage</h5>
                <p className="card-text">
                  Your resumes are stored securely on Amazon S3 with enterprise-grade encryption and reliability.
                </p>
                <ul className="text-muted">
                  <li>99.999999999% durability</li>
                  <li>Encrypted at rest and in transit</li>
                  <li>Scalable and cost-effective</li>
                  <li>Accessible from anywhere</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-md-6 mb-3">
            <div className="card shadow h-100">
              <div className="card-body">
                <h5 className="card-title">🔒 Privacy & Security</h5>
                <p className="card-text">
                  We take your privacy seriously. Your uploaded files are:
                </p>
                <ul className="text-muted">
                  <li>Only accessible by you</li>
                  <li>Protected by AWS IAM policies</li>
                  <li>Stored with unique identifiers</li>
                  <li>Never shared with third parties</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}