import { motion } from 'framer-motion';
import styles from './SimpleBento.module.css';

export default function SimpleBento({ cards = [] }) {
  return (
    <div className={styles.bentoGrid}>
      {cards.map((card, index) => (
        <motion.div
          key={index}
          className={styles.bentoCard}
          style={card.style}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ y: -5 }}
        >
          {card.label && (
            <div className={styles.cardLabel}>
              {card.label}
            </div>
          )}
          {card.title && (
            <h3 className={styles.cardTitle}>{card.title}</h3>
          )}
          <div className={styles.cardContent}>
            {card.content}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
