"use client";

import { AuthService } from "@/services/authService";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import styles from "./login.module.css";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setIsUnauthorized(false);
    try {
      const result = await AuthService.loginWithGoogle();

      if (!result.success && result.error === "unauthorized") {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }
    } catch (e: unknown) {
      console.error(e);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {isLoading && <GlobalLoader variant="overlay" />}
      {/* Animated background orbs */}
      <div className={styles.bgOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <motion.div
          className={styles.logoSection}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className={styles.logoIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="14" fill="url(#grad)" />
              <path
                d="M14 18L24 25L34 18"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 18H34V32H14V18Z"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="36"
                cy="14"
                r="5"
                fill="#00d2ff"
                stroke="#0a0a0f"
                strokeWidth="2"
              />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="48" y2="48">
                  <stop stopColor="#6c5ce7" />
                  <stop offset="1" stopColor="#00d2ff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className={styles.title}>GPMAS</h1>
          <p className={styles.subtitle}>Gaurav&apos;s Personal System</p>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className={styles.tagline}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Targeted email automation, exclusively designed for Gaurav.
          <br />
          This entire platform handles your schedule, your way.
        </motion.p>

        {/* Content Area */}
        <div
          style={{
            minHeight: "120px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <AnimatePresence mode="wait">
            {!isUnauthorized ? (
              <motion.div
                key="login-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <motion.button
                  className={styles.googleBtn}
                  onClick={signInWithGoogle}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    style={{ marginRight: "12px" }}
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>
                    {isLoading
                      ? "Authenticating..."
                      : "Enter Gaurav's Dashboard"}
                  </span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="unauthorized"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.4 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    boxShadow: "0 0 20px rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <ShieldAlert size={24} />
                </div>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Access Restricted
                </h3>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    textAlign: "center",
                    marginBottom: "1.25rem",
                    lineHeight: 1.5,
                  }}
                >
                  This is a private automation system.
                  <br />
                  Only recognized administrators are permitted.
                </p>
                <button
                  onClick={() => setIsUnauthorized(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "var(--bg-tertiary)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          className={styles.footer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <p className={styles.footerBrand}>
            Built &amp; Engineered by{" "}
            <span className={styles.footerAuthor}>Gaurav Patil</span>
          </p>
          <div className={styles.footerLinks}>
            <a
              href="https://www.gauravpatil.online"
              target="_blank"
              rel="noopener noreferrer"
            >
              Portfolio
            </a>
            <span className={styles.footerDot}>·</span>
            <a
              href="https://www.gauravworkspace.site"
              target="_blank"
              rel="noopener noreferrer"
            >
              Workspace
            </a>
          </div>
          <div className={styles.footerLegal}>
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            <span className={styles.footerDot}>·</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
            <span className={styles.footerDot}>·</span>
            <a href="/license" target="_blank" rel="noopener noreferrer">License</a>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
