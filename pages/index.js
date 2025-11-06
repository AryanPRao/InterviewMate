"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import dynamic from 'next/dynamic'
const DynamicSilk = dynamic(() => import('../components/Silk'), { ssr: false })
import Navbar from "../components/Navbar"
import AnimatedCard from "../components/AnimatedCard"
import { FaClipboardList, FaChartLine, FaFileUpload, FaTrophy } from "react-icons/fa"
import { motion } from "framer-motion"
import styles from "../styles/glass.module.css"

export default function Home() {
  const router = useRouter()
  const [userName, setUserName] = useState("")

  useEffect(() => {
    const userId = localStorage.getItem("user_id")
    const name = localStorage.getItem("user_name")

    if (!userId) {
      router.push("/login")
    } else {
      setUserName(name)
    }
  }, [])

  const features = [
    {
      icon: <FaClipboardList />,
      title: "Problem Tracker",
      description:
        "Log and organize your coding problems by difficulty, topic, and track your progress systematically.",
      link: "/tracker",
      color: "#60A5FA",
      gradient: "linear-gradient(to right, #60A5FA, #3B82F6)",
    },
    {
      icon: <FaChartLine />,
      title: "Analytics Dashboard",
      description:
        "Visualize your progress with beautiful charts showing problems solved by difficulty, topic, and points earned.",
      link: "/dashboard",
      color: "#6366F1",
      gradient: "linear-gradient(to right, #A78BFA, #8B5CF6)",
    },
    {
      icon: <FaFileUpload />,
      title: "Resume Upload",
      description: "Upload your resume to AWS S3 and get AI-powered feedback to optimize it for technical interviews.",
      link: "/upload",
      color: "#8B5CF6",
      gradient: "linear-gradient(to right, #C084FC, #A855F7)",
    },
    {
      icon: <FaTrophy />,
      title: "Leaderboard",
      description: "Compete with other users and see where you rank based on total problems solved and points earned.",
      link: "/dashboard",
      color: "#A78BFA",
      gradient: "linear-gradient(to right, #D8B4FE, #C084FC)",
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Liquid Ether background effect - fixed behind all content */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      >
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <DynamicSilk
            speed={5}
            scale={1}
            color="#7B7481"
            noiseIntensity={1.5}
            rotation={0}
          />
        </div>
      </div>

      {/* All content above the background */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />

        <div className="container-custom">
          <motion.div
            className={`${styles.pageHeaderGlass} page-header`}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className={styles.primaryHeading} style={{
              textShadow: "2px 2px 0px rgba(0,0,0,0.3), -1px -1px 0px rgba(255,255,255,0.03)"
            }}>
              Welcome to InterviewMate
            </h1>
            <p className={styles.subheading} style={{
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
            }}>
              Your complete platform for technical interview preparation
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div className="row g-4 mb-5" variants={containerVariants} initial="hidden" animate="visible">
            {features.map((feature, index) => (
                <motion.div key={index} className="col-md-6 col-lg-3" variants={itemVariants}>
                <AnimatedCard delay={index * 0.1}>
                  <div className={`${styles.cardIconGlass} card-icon`} style={{ color: feature.color }}>
                    {feature.icon}
                  </div>
                  <h3
                    className={`${styles.cardTitle} ${feature.gradient ? styles.gradientText : ''}`}
                    style={feature.gradient ? { background: feature.gradient } : {}}
                  >
                    {feature.title}
                  </h3>
                  <p className={styles.cardDescription} style={{
                    textShadow: "1px 1px 1px rgba(0,0,0,0.3)"
                  }}>{feature.description}</p>
                  <motion.button
                    className={styles.glassButton}
                    onClick={() => router.push(feature.link)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Get Started
                  </motion.button>
                </AnimatedCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats Section */}
          <div className="row g-4 mb-5">
            <motion.div
              className="col-md-6"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
            <div className={styles.glassFeatureCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#60A5FA' }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <h3 className={styles.cardTitle} style={{ 
                  margin: 0,
                  textShadow: "1px 1px 2px rgba(0,0,0,0.4), -0.5px -0.5px 1px rgba(255,255,255,0.05)"
                }}>Quick Stats</h3>
              </div>
              <p className={styles.cardDescription + ' mb-4'} style={{
                textShadow: "1px 1px 1px rgba(0,0,0,0.3)"
              }}>Track your progress and stay motivated with real-time statistics</p>
              <div className="row text-center g-3">
                <div className="col-4">
                  <motion.div className={styles.glassStatCard} whileHover={{ y: -5 }}>
                    <h2 style={{ 
                      fontSize: "2rem", 
                      fontWeight: "bold", 
                      margin: 0, 
                      color: "#60A5FA",
                      textShadow: "2px 2px 3px rgba(0,0,0,0.5), -1px -1px 1px rgba(255,255,255,0.1)"
                    }}>0</h2>
                    <p style={{ 
                      margin: 0, 
                      fontSize: "0.9rem", 
                      marginTop: "0.5rem", 
                      color: "#CBD5E1",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.4)"
                    }}>
                      Problems
                    </p>
                  </motion.div>
                </div>
                <div className="col-4">
                  <motion.div className={styles.glassStatCard} whileHover={{ y: -5 }}>
                    <h2 style={{ 
                      fontSize: "2rem", 
                      fontWeight: "bold", 
                      margin: 0, 
                      color: "#8B5CF6",
                      textShadow: "2px 2px 3px rgba(0,0,0,0.5), -1px -1px 1px rgba(255,255,255,0.1)"
                    }}>0</h2>
                    <p style={{ 
                      margin: 0, 
                      fontSize: "0.9rem", 
                      marginTop: "0.5rem", 
                      color: "#CBD5E1",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.4)"
                    }}>
                      Points
                    </p>
                  </motion.div>
                </div>
                <div className="col-4">
                  <motion.div className={styles.glassStatCard} whileHover={{ y: -5 }}>
                    <h2 style={{ 
                      fontSize: "2rem", 
                      fontWeight: "bold", 
                      margin: 0, 
                      color: "#6366F1",
                      textShadow: "2px 2px 3px rgba(0,0,0,0.5), -1px -1px 1px rgba(255,255,255,0.1)"
                    }}>0</h2>
                    <p style={{ 
                      margin: 0, 
                      fontSize: "0.9rem", 
                      marginTop: "0.5rem", 
                      color: "#CBD5E1",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.4)"
                    }}>
                      Streak
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="col-md-6"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className={styles.glassFeatureCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#8B5CF6' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                <h3 className={styles.cardTitle} style={{ 
                  margin: 0,
                  textShadow: "1px 1px 2px rgba(0,0,0,0.4), -0.5px -0.5px 1px rgba(255,255,255,0.05)"
                }}>Pro Tips</h3>
              </div>
              <ul style={{ 
                color: "#9CA3AF", 
                fontSize: "1rem", 
                lineHeight: 1.7, 
                fontWeight: 300,
                textShadow: "1px 1px 1px rgba(0,0,0,0.3)"
              }}>
                <li>Start with Easy problems to build confidence</li>
                <li>Focus on understanding patterns, not memorizing</li>
                <li>Practice consistently - even 1 problem daily helps</li>
                <li>Review your solutions and optimize them</li>
                <li>Track topics you're weak in and improve them</li>
              </ul>
            </div>
          </motion.div>
          </div>

          {/* How It Works */}
          <motion.div
            className="text-center mb-5"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className={styles.glassFeatureCard} style={{ maxWidth: "900px", margin: "0 auto" }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#6366F1' }}>
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
                <h3 className={styles.cardTitle} style={{ 
                  margin: 0,
                  textShadow: "1px 1px 2px rgba(0,0,0,0.4), -0.5px -0.5px 1px rgba(255,255,255,0.05)"
                }}>How InterviewMate Works</h3>
              </div>
              <div className="row mt-4 g-3">
                {[
                  { 
                    icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#60A5FA' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>,
                    title: "Track", 
                    desc: "Log every problem you solve" 
                  },
                  { 
                    icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#8B5CF6' }}>
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>,
                    title: "Analyze", 
                    desc: "Review your progress" 
                  },
                  { 
                    icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#6366F1' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="16 12 12 8 8 12"></polyline>
                      <line x1="12" y1="16" x2="12" y2="8"></line>
                    </svg>,
                    title: "Improve", 
                    desc: "Focus on weak areas" 
                  },
                  { 
                    icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#A78BFA' }}>
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                      <path d="M4 22h16"></path>
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                    </svg>,
                    title: "Succeed", 
                    desc: "Ace your interviews" 
                  },
              ].map((step, idx) => (
                <motion.div key={idx} className="col-md-3 mb-3" whileHover={{ y: -8 }}>
                  <div style={{ marginBottom: "0.75rem" }}>{step.icon}</div>
                  <h5 style={{ 
                    fontWeight: 600, 
                    color: "#F9FAFB", 
                    fontFamily: 'Inter',
                    textShadow: "1px 1px 2px rgba(0,0,0,0.4)"
                  }}>{step.title}</h5>
                  <p style={{ 
                    fontSize: "0.9rem", 
                    color: "#9CA3AF", 
                    fontWeight: 300,
                    textShadow: "1px 1px 1px rgba(0,0,0,0.3)"
                  }}>{step.desc}</p>
                </motion.div>
              ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
