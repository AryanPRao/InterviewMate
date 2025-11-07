import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import MagicBento from '../components/MagicBento';
import axios from 'axios';
import { FaFileUpload, FaFilePdf, FaDownload, FaMagic } from 'react-icons/fa';
import styles from '../styles/glass.module.css';
import { motion } from 'framer-motion';

export default function Upload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);

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
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setAnalysis('');
      setShowAnalysis(false);
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
      document.getElementById('fileInput').value = '';
      fetchResumes();

      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error('Error uploading resume:', error);
      alert('Failed to upload resume. Please check your AWS configuration and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setAnalyzing(true);
    setAnalysis('');
    setCandidateName('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post('http://localhost:5000/api/analyze-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setAnalysis(response.data.analysis);
      setCandidateName(response.data.candidate_name || '');
      setShowAnalysis(true);
    } catch (error) {
      console.error('Error analyzing resume:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('Failed to analyze resume. Please make sure Gemini API key is configured.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div className={styles.silkHueBackground} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        
        <div className="container-custom">
          <motion.div 
            className={`${styles.pageHeaderGlass} text-center mb-5`}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className={styles.primaryHeading}>Resume Upload & Analysis</h1>
            <p className={styles.subheading}>Upload your resume and get AI-powered feedback</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            viewport={{ once: true }}
            style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 2rem' }}
          >
          <MagicBento
            textAutoHide={false}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={true}
            enableMagnetism={true}
            clickEffect={true}
            spotlightRadius={300}
            particleCount={8}
            glowColor="99, 102, 241"
            cards={[
              {
                color: '#0a0118',
                title: 'Upload & Analyze',
                label: 'Resume Manager',
                style: { 
                  aspectRatio: 'unset', 
                  minHeight: '600px',
                  display: 'flex',
                  flexDirection: 'column'
                },
                content: (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '1rem',
                    flex: 1
                  }}>
                    <p className={styles.cardDescription} style={{ marginBottom: '1rem' }}>
                      Upload your resume in PDF format (max 5MB). Get instant AI analysis or store it securely on AWS S3.
                    </p>

                    {uploadSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          padding: '0.75rem 1rem',
                          marginBottom: '1rem',
                          borderRadius: '12px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          color: '#86efac',
                          fontSize: '0.9rem'
                        }}
                      >
                        Resume uploaded successfully to AWS S3!
                      </motion.div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ 
                        display: 'block',
                        marginBottom: '0.75rem',
                        fontWeight: 600,
                        color: '#D1D5DB',
                        fontSize: '0.9rem'
                      }}>
                        Select PDF Resume
                      </label>

                      <label 
                        htmlFor="fileInput" 
                        className={styles.glassButton} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer',
                          width: '100%',
                          padding: '0.75rem 1rem',
                          margin: 0
                        }}
                      >
                        <FaFilePdf style={{ marginRight: '0.5rem' }} />
                        Choose PDF
                      </label>
                      <input
                        type="file"
                        id="fileInput"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />

                      {selectedFile && (
                        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                          <span style={{ color: '#60A5FA', fontWeight: 600, fontSize: '0.9rem' }}>
                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                      <motion.button 
                        className={styles.glassButton}
                        onClick={handleAnalyze}
                        disabled={!selectedFile || analyzing}
                        whileHover={{ scale: selectedFile && !analyzing ? 1.05 : 1 }}
                        whileTap={{ scale: selectedFile && !analyzing ? 0.95 : 1 }}
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'auto',
                          flex: 1,
                          opacity: !selectedFile || analyzing ? 0.5 : 1,
                          cursor: !selectedFile || analyzing ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <FaMagic style={{ marginRight: '0.5rem' }} />
                        {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                      </motion.button>
                      
                      <motion.button 
                        className={styles.glassButton}
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        whileHover={{ scale: selectedFile && !uploading ? 1.05 : 1 }}
                        whileTap={{ scale: selectedFile && !uploading ? 0.95 : 1 }}
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'auto',
                          flex: 1,
                          opacity: !selectedFile || uploading ? 0.5 : 1,
                          cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
                          background: 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                        }}
                      >
                        <FaFileUpload style={{ marginRight: '0.5rem' }} />
                        {uploading ? 'Uploading...' : 'Upload to S3'}
                      </motion.button>
                    </div>
                  </div>
                )
              },
              {
                color: '#0a0118',
                title: 'AI Analysis',
                label: 'Results',
                style: { 
                  aspectRatio: 'unset', 
                  minHeight: '600px',
                  display: 'flex',
                  flexDirection: 'column'
                },
                content: showAnalysis && analysis ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '1rem',
                      gap: '0.5rem'
                    }}>
                      <FaMagic style={{ color: '#86efac', fontSize: '1.25rem' }} />
                      <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                        AI Resume Analysis
                      </h3>
                    </div>
                    {candidateName && candidateName !== 'the candidate' && (
                      <p className={styles.cardDescription} style={{ marginBottom: '1rem' }}>
                        Analysis for <strong style={{ color: '#60A5FA' }}>{candidateName}</strong>
                      </p>
                    )}
                    <div style={{ 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: '1.8',
                      fontSize: '0.9rem',
                      color: '#D1D5DB',
                      flex: 1,
                      overflowY: 'auto',
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      {analysis}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '2rem 1rem',
                    height: '100%',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.6 }}>
                      <FaMagic />
                    </div>
                    <p className={styles.cardDescription} style={{ 
                      maxWidth: '90%', 
                      margin: 0, 
                      lineHeight: 1.6, 
                      fontSize: '0.95rem' 
                    }}>
                      Upload a resume and click "Analyze with AI" to see detailed feedback
                    </p>
                  </div>
                )
              },
              {
                color: '#0a0118',
                title: 'Storage',
                label: 'Your Uploaded Resumes',
                style: { 
                  aspectRatio: 'unset', 
                  minHeight: '500px',
                  display: 'flex',
                  flexDirection: 'column',
                  gridColumn: '1 / -1'
                },
                content: (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden'
                  }}>
                    {loading ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flex: 1,
                        padding: '2rem 0' 
                      }}>
                        <div className="spinner-custom"></div>
                      </div>
                    ) : resumes.length === 0 ? (
                      <div style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        padding: '2rem 0',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>
                          <FaFilePdf />
                        </div>
                        <p className={styles.cardDescription}>No resumes uploaded yet</p>
                      </div>
                    ) : (
                      <div style={{ 
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'auto'
                      }}>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'separate', 
                          borderSpacing: '0 0.5rem' 
                        }}>
                          <thead>
                            <tr>
                              <th style={{ 
                                color: '#9CA3AF', 
                                fontWeight: 600, 
                                fontSize: '0.9rem', 
                                padding: '0.75rem', 
                                textAlign: 'left', 
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                position: 'sticky',
                                top: 0,
                                background: '#060010',
                                zIndex: 1
                              }}>
                                Filename
                              </th>
                              <th style={{ 
                                color: '#9CA3AF', 
                                fontWeight: 600, 
                                fontSize: '0.9rem', 
                                padding: '0.75rem', 
                                textAlign: 'left', 
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                position: 'sticky',
                                top: 0,
                                background: '#060010',
                                zIndex: 1
                              }}>
                                Upload Date
                              </th>
                              <th style={{ 
                                color: '#9CA3AF', 
                                fontWeight: 600, 
                                fontSize: '0.9rem', 
                                padding: '0.75rem', 
                                textAlign: 'left', 
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                position: 'sticky',
                                top: 0,
                                background: '#060010',
                                zIndex: 1
                              }}>
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumes.map((resume) => (
                              <tr key={resume.id}>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FaFilePdf style={{ color: '#f56565', fontSize: '1.1rem' }} />
                                    <strong style={{ color: '#F3F4F6', fontSize: '0.95rem' }}>
                                      {resume.filename}
                                    </strong>
                                  </div>
                                </td>
                                <td style={{ 
                                  padding: '0.75rem', 
                                  color: '#9CA3AF', 
                                  fontSize: '0.9rem' 
                                }}>
                                  {new Date(resume.uploaded_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <motion.a 
                                    href={resume.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    whileHover={{ scale: 1.05 }} 
                                    whileTap={{ scale: 0.95 }} 
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '0.5rem', 
                                      padding: '0.5rem 1rem', 
                                      borderRadius: '8px', 
                                      background: 'linear-gradient(135deg, #60A5FA, #3B82F6)', 
                                      color: '#F9FAFB', 
                                      fontSize: '0.85rem', 
                                      fontWeight: 500, 
                                      textDecoration: 'none', 
                                      border: '1px solid rgba(59,130,246,0.3)' 
                                    }}
                                  >
                                    <FaDownload />
                                    Download
                                  </motion.a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              }
            ]}
          />
          </motion.div>

          {/* Info Footer Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ 
              marginTop: '3rem',
              marginBottom: '3rem'
            }}
          >
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              padding: '2rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)'
            }}>
              <div>
                <h5 style={{ 
                  color: '#F3F4F6',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FaMagic style={{ color: '#86efac' }} />
                  AI-Powered Analysis
                </h5>
                <p className={styles.cardDescription} style={{ marginBottom: '1rem' }}>
                  Get instant feedback using Google's Gemini AI:
                </p>
                <ul style={{ 
                  color: '#9CA3AF',
                  fontSize: '0.85rem',
                  lineHeight: '1.8',
                  paddingLeft: '1.25rem',
                  margin: 0
                }}>
                  <li>Overall impression & strengths</li>
                  <li>Areas for improvement</li>
                  <li>Technical skills assessment</li>
                  <li>Format & readability check</li>
                  <li>Actionable recommendations</li>
                </ul>
              </div>

              <div>
                <h5 style={{ 
                  color: '#F3F4F6',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  ☁️ Secure Cloud Storage
                </h5>
                <p className={styles.cardDescription} style={{ marginBottom: '1rem' }}>
                  Your resumes are stored securely on Amazon S3:
                </p>
                <ul style={{ 
                  color: '#9CA3AF',
                  fontSize: '0.85rem',
                  lineHeight: '1.8',
                  paddingLeft: '1.25rem',
                  margin: 0
                }}>
                  <li>99.999999999% durability</li>
                  <li>Encrypted at rest and in transit</li>
                  <li>Scalable and cost-effective</li>
                  <li>Accessible from anywhere</li>
                </ul>
              </div>

              <div>
                <h5 style={{ 
                  color: '#F3F4F6',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🔒 Privacy & Security
                </h5>
                <p className={styles.cardDescription} style={{ marginBottom: '1rem' }}>
                  We take your privacy seriously:
                </p>
                <ul style={{ 
                  color: '#9CA3AF',
                  fontSize: '0.85rem',
                  lineHeight: '1.8',
                  paddingLeft: '1.25rem',
                  margin: 0
                }}>
                  <li>Only accessible by you</li>
                  <li>Protected by AWS IAM policies</li>
                  <li>AI analysis is instant & private</li>
                  <li>Never shared with third parties</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
