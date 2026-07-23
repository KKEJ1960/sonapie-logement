import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Download } from 'lucide-react'
import { usePWAInstall } from '../hooks/usePWAInstall.js'

const O = '#E8520A'
const G = '#2E7D32'

export default function LandingPage() {
  const navigate           = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { isInstallable, installApp } = usePWAInstall()

  const enter = (delay = 0) => shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] } }

  return (
    <div
      style={{
        /* position fixed = colle exactement aux 4 bords de l'écran,
           aucun scroll possible, aucun espace résiduel */
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
        /* fond blanc + très légères teintes aux coins */
        background: `
          radial-gradient(ellipse at 75% 15%, rgba(232,82,10,0.06) 0%, transparent 45%),
          radial-gradient(ellipse at 25% 85%, rgba(46,125,50,0.06) 0%, transparent 45%),
          #FFFFFF
        `,
      }}
    >
      {/* ── Barre top orange → vert ── */}
      <div
        style={{
          height: 5,
          flexShrink: 0,
          background: `linear-gradient(90deg, ${O} 0%, ${G} 100%)`,
        }}
      />

      {/* ── Contenu centré verticalement et horizontalement ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
          padding: '0 28px',
        }}
      >
        {/* Logo */}
        <motion.img
          src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg"
          alt="SONAPIE"
          decoding="async"
          fetchPriority="high"
          width="1600"
          height="380"
          {...enter(0)}
          style={{
            width: 'min(440px, 78vw)',
            height: 'auto',
            display: 'block',
            mixBlendMode: 'multiply',
          }}
        />

        {/* Séparateur orange → vert */}
        <motion.div
          {...enter(0.3)}
          style={{
            width: 72,
            height: 3,
            borderRadius: 99,
            background: `linear-gradient(90deg, ${O} 0%, ${G} 100%)`,
          }}
        />

        {/* Bouton Commencer */}
        <motion.button
          {...enter(0.45)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/login')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: O,
            color: '#FFFFFF',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: '1.1rem',
            border: 'none',
            borderRadius: 999,
            padding: '17px 40px 17px 52px',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            boxShadow: `0 8px 32px rgba(232,82,10,0.30)`,
            transition: 'background 180ms ease, box-shadow 180ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#c4430a'
            e.currentTarget.style.boxShadow = `0 12px 44px rgba(232,82,10,0.45)`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = O
            e.currentTarget.style.boxShadow = `0 8px 32px rgba(232,82,10,0.30)`
          }}
        >
          Commencer
          <span
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChevronRight size={16} />
          </span>
        </motion.button>

        {/* Bouton Installer l'application (PWA) — visible seulement si le navigateur le permet */}
        {isInstallable && (
          <motion.button
            {...enter(0.55)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={installApp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              color: '#475569',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: '0.9rem',
              border: '1.5px solid #E2E8F0',
              borderRadius: 999,
              padding: '10px 22px',
              cursor: 'pointer',
              transition: 'background 180ms ease, border-color 180ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E2E8F0' }}
          >
            <Download size={15} />
            Installer l'application
          </motion.button>
        )}
      </div>

      {/* ── Barre bottom vert → orange ── */}
      <div
        style={{
          height: 4,
          flexShrink: 0,
          background: `linear-gradient(90deg, ${G} 0%, ${O} 100%)`,
        }}
      />
    </div>
  )
}
