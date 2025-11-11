"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Navbar from "../components/Navbar"
import ThemeToggle from "../components/ThemeToggle"
import SimpleBento from "../components/SimpleBento"
import styles from "../styles/glass.module.css"
import bentoStyles from "../components/SimpleBento.module.css"
import axios from "axios"
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Doughnut, Bar, Line } from "react-chartjs-2"
import { motion } from "framer-motion"

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ total_problems: 0, total_points: 0 })
  const [difficultyData, setDifficultyData] = useState(null)
  const [topicData, setTopicData] = useState(null)
  const [pointsData, setPointsData] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(() => {
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      router.push("/login")
    } else {
      fetchAnalytics()
    }
  }, [])

  const fetchAnalytics = async () => {
    try {
      const userId = localStorage.getItem("user_id")

      // Fetch summary
      const summaryRes = await axios.get(`http://localhost:5000/api/analytics/summary?user_id=${userId}`)
      setSummary(summaryRes.data)

      // Fetch difficulty distribution
      const diffRes = await axios.get(`http://localhost:5000/api/analytics/difficulty?user_id=${userId}`)
      if (diffRes.data.length > 0) {
        setDifficultyData({
          labels: diffRes.data.map((d) => d.difficulty),
          datasets: [
            {
              data: diffRes.data.map((d) => d.count),
              backgroundColor: ["#48bb78", "#ed8936", "#f56565"],
              borderWidth: 0,
            },
          ],
        })
      }

      // Fetch topic distribution
      const topicRes = await axios.get(`http://localhost:5000/api/analytics/topic?user_id=${userId}`)
      if (topicRes.data.length > 0) {
        setTopicData({
          labels: topicRes.data.map((t) => t.topic),
          datasets: [
            {
              label: "Problems Solved",
              data: topicRes.data.map((t) => t.count),
              backgroundColor: "rgba(102, 126, 234, 0.8)",
              borderRadius: 10,
            },
          ],
        })
      }

      // Fetch points over time
      const pointsRes = await axios.get(`http://localhost:5000/api/analytics/points?user_id=${userId}`)
      if (pointsRes.data.length > 0) {
        setPointsData({
          labels: pointsRes.data.map((p) =>
            new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          ),
          datasets: [
            {
              label: "Total Points",
              data: pointsRes.data.map((p) => p.points),
              borderColor: "#667eea",
              backgroundColor: "rgba(102, 126, 234, 0.1)",
              tension: 0.4,
              fill: true,
              pointBackgroundColor: "#667eea",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 5,
            },
          ],
        })
      }

      // Fetch leaderboard
      const leaderRes = await axios.get("http://localhost:5000/api/leaderboard")
      setLeaderboard(leaderRes.data)
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          font: { size: 12, weight: "bold" },
        },
      },
    },
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Static silk hue background (non-animated) */}
      <div className={styles.silkHueBackground} />

      <div style={{ position: "relative", zIndex: 1 }}>
      <Navbar />
      <ThemeToggle />

        <div className="container-custom">
        <motion.div
          className={`${styles.pageHeaderGlass} page-header`}
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className={styles.primaryHeading}>
            Analytics Dashboard
          </h1>
          <p className={styles.subheading}>
            Track your progress and performance
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center">
            <div className="spinner-custom"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards with Simple Bento */}
            <SimpleBento
              cards={[
                {
                  title: 'Total Problems',
                  label: 'Progress',
                  content: (
                    <motion.div className="d-flex align-items-center" whileHover={{ scale: 1.02 }}>
                      <div
                        style={{
                          fontSize: '2.5rem',
                          marginRight: '1rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        📝
                      </div>
                      <div>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>
                          {summary.total_problems}
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>
                          Problems Solved
                        </p>
                      </div>
                    </motion.div>
                  )
                },
                {
                  title: 'Total Points',
                  label: 'Score',
                  content: (
                    <motion.div className="d-flex align-items-center" whileHover={{ scale: 1.02 }}>
                      <div
                        style={{
                          fontSize: '2.5rem',
                          marginRight: '1rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        ⭐
                      </div>
                      <div>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>
                          {summary.total_points}
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>
                          Points Earned
                        </p>
                      </div>
                    </motion.div>
                  )
                },
                {
                  title: 'Difficulty Distribution',
                  label: 'Analysis',
                  content: difficultyData ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ maxWidth: '280px', margin: '0 auto', height: '200px' }}>
                        <Doughnut data={difficultyData} options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                padding: 10,
                                font: { size: 10, weight: 'bold' },
                              },
                            },
                          },
                        }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-center" style={{ opacity: 0.7 }}>No data available</p>
                  )
                },
                {
                  title: 'Topic Distribution',
                  label: 'Topics',
                  content: topicData ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ height: '250px' }}>
                        <Bar data={topicData} options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                          },
                          scales: {
                            y: {
                              ticks: { color: '#9CA3AF' },
                              grid: { color: 'rgba(255,255,255,0.05)' }
                            },
                            x: {
                              ticks: { color: '#9CA3AF' },
                              grid: { display: false }
                            }
                          }
                        }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-center" style={{ opacity: 0.7 }}>No data available</p>
                  )
                },
                {
                  title: 'Points Progress',
                  label: 'Timeline',
                  content: pointsData ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ height: '180px' }}>
                        <Line data={pointsData} options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                          },
                          scales: {
                            y: {
                              ticks: { color: '#9CA3AF' },
                              grid: { color: 'rgba(255,255,255,0.05)' }
                            },
                            x: {
                              ticks: { color: '#9CA3AF' },
                              grid: { display: false }
                            }
                          }
                        }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-center" style={{ opacity: 0.7 }}>No data available</p>
                  )
                },
                {
                  title: 'Quick Actions',
                  label: 'Navigate',
                  content: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center', height: '100%' }}>
                      <motion.button
                        className="btn btn-primary-custom"
                        onClick={() => router.push("/tracker")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ fontSize: '0.875rem' }}
                      >
                        Go to Tracker
                      </motion.button>
                      <motion.button
                        className="btn btn-primary-custom"
                        onClick={() => router.push("/upload")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ fontSize: '0.875rem', background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)' }}
                      >
                        Upload Resume
                      </motion.button>
                    </div>
                  )
                }
              ]}
            />

            {summary.total_problems === 0 && (
              <motion.div
                className={bentoStyles.bentoCard}
                style={{ padding: '1.5rem', marginTop: '1.5rem' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <h3 className={bentoStyles.cardTitle} style={{ marginBottom: '0.5rem' }}>No Data Yet</h3>
                  <p className={bentoStyles.cardContent} style={{ textAlign: 'center', marginBottom: '1.25rem' }}>Start solving problems to see your analytics!</p>
                  <motion.button
                    className={`${styles.glassButton}`}
                    onClick={() => router.push("/tracker")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ padding: '0.75rem 2rem' }}
                  >
                    Go to Tracker
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <motion.div
                className="row g-4 mb-5"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="col-12">
                  <div className={styles.glassFeatureCard}>
                    <h3 className={styles.cardTitle}>🏆 Global Leaderboard</h3>
                    <p className="card-text mb-4">See how you rank against other users</p>
                    <div className="table-responsive">
                      <table className="table-custom">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Problems Solved</th>
                            <th>Total Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((user, index) => (
                            <motion.tr key={index} whileHover={{ x: 5 }}>
                              <td>
                                <strong style={{ fontSize: "1.2rem" }}>
                                  {index === 0 && "🥇"}
                                  {index === 1 && "🥈"}
                                  {index === 2 && "🥉"}
                                  {index > 2 && `#${index + 1}`}
                                </strong>
                              </td>
                              <td>
                                <strong>{user.name}</strong>
                              </td>
                              <td>{user.total_problems || 0}</td>
                              <td>
                                <strong>{user.total_points || 0}</strong>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}
