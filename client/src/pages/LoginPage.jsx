import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, UserPlus, FileText, BellRing, Wrench } from 'lucide-react'
import axios from 'axios'

const O = '#E8520A'
const GRADIENT = 'linear-gradient(135deg, #E8520A 0%, #ff8c4a 100%)'

const FEATURES = [
  { icon: <UserPlus size={17} />, titre: 'Créez votre compte locataire', sous: 'Inscription rapide et sécurisée' },
  { icon: <FileText size={17} />, titre: 'Déposez votre demande de logement', sous: 'En quelques clics seulement' },
  { icon: <BellRing size={17} />, titre: 'Suivez l\'avancement en temps réel', sous: 'Notifications et suivi automatique' },
  { icon: <Wrench size={17} />, titre: 'Signalez des pannes facilement', sous: 'Intervention rapide garantie' },
]

// ─── Champ de saisie réutilisable ─────────────────────────────────────────────
function InputField({ label, type = 'text', placeholder, value, onChange, iconLeft, iconRight }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: 'block', marginBottom: 6,
          fontSize: '0.82rem', fontWeight: 600,
          color: '#374151', letterSpacing: '0.01em',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {iconLeft && (
          <span
            style={{
              position: 'absolute', left: 13, top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF', display: 'flex', pointerEvents: 'none',
            }}
          >
            {iconLeft}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          style={{
            width: '100%',
            padding: `12px 14px 12px ${iconLeft ? '42px' : '14px'}`,
            paddingRight: iconRight ? 44 : 14,
            border: '1.5px solid #E5E7EB',
            borderRadius: 10,
            fontSize: '0.95rem',
            color: '#1A1A1A',
            background: '#FAFAFA',
            outline: 'none',
            transition: 'border-color 200ms ease, box-shadow 200ms ease, background 200ms ease',
            fontFamily: "'Inter', sans-serif",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = O
            e.target.style.boxShadow = `0 0 0 3px rgba(232,82,10,0.12)`
            e.target.style.background = '#FFFFFF'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#E5E7EB'
            e.target.style.boxShadow = 'none'
            e.target.style.background = '#FAFAFA'
          }}
        />
        {iconRight && (
          <span
            style={{
              position: 'absolute', right: 13, top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex', cursor: 'pointer',
            }}
          >
            {iconRight}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Écran de validation post-connexion ──────────────────────────────────────
function SuccessScreen({ user }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#FFFFFF',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'sf-in 0.25s ease-out',
    }}>
      {/* Halo radial en fond — casse le vide sur grand écran */}
      <div style={{
        position: 'absolute',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,82,10,0.07) 0%, transparent 68%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Cercle + coche */}
        <div style={{ position: 'relative', marginBottom: 28, animation: 'sf-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.05s both' }}>
          {/* Anneau pulsant après succès */}
          <div style={{
            position: 'absolute', inset: -14, borderRadius: '50%',
            background: 'rgba(232,82,10,0.10)',
            animation: 'sf-pulse 1.4s ease-out 0.9s infinite',
          }} />

          <svg width="124" height="124" viewBox="0 0 124 124" fill="none">
            <circle cx="62" cy="62" r="58" fill="#FFF4EF" />
            <circle
              cx="62" cy="62" r="54"
              stroke={O} strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray="339" strokeDashoffset="339"
              style={{ animation: 'sf-circle 0.55s ease-out 0.1s forwards' }}
            />
            <polyline
              points="38,64 54,80 86,46"
              stroke={O} strokeWidth="6"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="90" strokeDashoffset="90"
              style={{ animation: 'sf-check 0.32s ease-out 0.6s forwards' }}
            />
          </svg>
        </div>

        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: '1.3rem', fontWeight: 700,
          color: '#111827', margin: '0 0 8px',
          letterSpacing: '-0.01em',
          animation: 'sf-up 0.38s ease-out 0.75s both',
        }}>
          Connexion réussie !
        </h2>

        <p style={{
          color: '#94A3B8', fontSize: '0.9rem', fontWeight: 500,
          animation: 'sf-up 0.38s ease-out 0.88s both',
          margin: 0,
        }}>
          Bienvenue, {user?.prenom || 'vous'}
        </p>
      </div>

      {/* Barre de progression en bas */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#F3F4F6' }}>
        <div style={{
          height: '100%',
          background: GRADIENT,
          animation: 'sf-bar 1.8s linear 0.1s forwards',
          width: '0%',
        }} />
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successUser, setSuccessUser] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/auth/login', { email, motDePasse: password })
      const { token, user } = response.data

      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(user))

      const dest = {
        SUPER_ADMIN:      '/super-admin/dashboard',
        ADMIN:            '/admin/dashboard',
        DIRECTION:        '/direction/dashboard',
        LOCATAIRE:        '/locataire/dashboard',
        RESPONSABLE:      '/responsable/dashboard',
        TECHNICIEN:       '/technicien/dashboard',
        SERVICE_LOGEMENT: '/service-logement/dashboard',
      }[user.role] || '/'

      setSuccessUser(user)
      setTimeout(() => navigate(dest), 1800)

    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        fontFamily: "'Inter', sans-serif",
        background: '#F9FAFB',
      }}
    >
      {successUser && <SuccessScreen user={successUser} />}
      {/* ══ COLONNE GAUCHE (desktop uniquement) ════════════════════════════ */}
      <div
        className="hidden md:flex"
        style={{
          flex: '0 0 45%',
          height: '100vh',
          background: O,
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 36px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cercles décoratifs animés */}
        {[
          { size: 500, top: -180, right: -180, opacity: 0.035, delay: 0,   dur: 9 },
          { size: 320, top: -80,  right: -80,   opacity: 0.045, delay: 0.6, dur: 7 },
          { size: 400, bottom: -160, left: -160, opacity: 0.035, delay: 0.3, dur: 10 },
          { size: 240, bottom: -60,  left: -60,   opacity: 0.045, delay: 0.9, dur: 8 },
        ].map((c, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              position: 'absolute',
              width: c.size, height: c.size,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.10)',
              background: `rgba(255,255,255,${c.opacity})`,
              top: c.top, right: c.right,
              bottom: c.bottom, left: c.left,
              pointerEvents: 'none',
              animation: `floatCircle ${c.dur}s ease-in-out ${c.delay}s infinite`,
            }}
          />
        ))}

        {/* Logo dans un cadre blanc */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            background: '#FFFFFF',
            borderRadius: 999,
            padding: '9px 20px',
            marginBottom: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            position: 'relative', zIndex: 1,
          }}
        >
          <img
            src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg"
            alt="SONAPIE"
            style={{ width: 150, height: 'auto', display: 'block', mixBlendMode: 'multiply' }}
          />
        </motion.div>

        {/* Titre + sous-titre */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{
            color: '#FFFFFF', fontSize: '1.28rem', fontWeight: 700,
            textAlign: 'center', lineHeight: 1.28,
            margin: '0 0 6px', maxWidth: 380,
            position: 'relative', zIndex: 1,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Accédez à votre logement SONAPIE en toute simplicité
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{
            color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem',
            textAlign: 'center', lineHeight: 1.4,
            margin: '0 0 14px', maxWidth: 300,
            position: 'relative', zIndex: 1,
          }}
        >
          Créez votre compte et profitez d'une expérience digitale fluide et sécurisée.
        </motion.p>

        {/* Points forts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            display: 'flex', flexDirection: 'column', gap: 9,
            width: '100%', maxWidth: 320,
            position: 'relative', zIndex: 1,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.titre}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', flexShrink: 0,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.82rem' }}>{f.titre}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>{f.sous}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Illustration immeuble — ancrée en bas du panneau */}
        <div style={{ marginTop: 'auto', width: '100%', position: 'relative', zIndex: 1, lineHeight: 0 }}>
          <img
            src="/ChatGPT Image 14 juil. 2026, 14_52_02.png"
            alt=""
            aria-hidden
            style={{ width: '100%', maxHeight: 310, objectFit: 'contain', objectPosition: 'bottom', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
          />
        </div>
      </div>

      {/* ══ COLONNE DROITE — formulaire ════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          background: '#FFFFFF',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 420 }}
        >
          {/* Logo mobile uniquement */}
          <div
            className="md:hidden"
            style={{ textAlign: 'center', marginBottom: 28 }}
          >
            <img
              src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg"
              alt="SONAPIE"
              style={{ width: 180, height: 'auto', display: 'inline-block', mixBlendMode: 'multiply' }}
            />
          </div>

          {/* Titre */}
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '1.9rem', fontWeight: 700,
              color: '#1A1A1A', margin: '0 0 6px',
            }}
          >
            Bon retour
          </h1>
          <p style={{ color: '#666666', fontSize: '0.9rem', margin: '0 0 32px' }}>
            Connectez-vous à votre espace SONAPIE
          </p>

          {/* Formulaire */}
          <form onSubmit={handleLogin}>
            <InputField
              label="Adresse email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              iconLeft={<Mail size={17} />}
            />

            <InputField
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              iconLeft={<Lock size={17} />}
              iconRight={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#9CA3AF', cursor: 'pointer', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
            />

            {/* Mot de passe oublié */}
            <div style={{ textAlign: 'right', marginTop: -10, marginBottom: 24 }}>
              <button
                type="button"
                style={{
                  background: 'none', border: 'none',
                  color: O, fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer', padding: 0,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Message d'erreur */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 10, padding: '12px 14px',
                  marginBottom: 20,
                }}
              >
                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', color: '#DC2626' }}>{error}</span>
              </motion.div>
            )}

            {/* Bouton Se connecter */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#f0956a' : O,
                color: '#FFFFFF',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700, fontSize: '1rem',
                border: 'none', borderRadius: 12,
                padding: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 200ms ease, transform 150ms ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 24,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#c4430a' }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = O }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#FFFFFF', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite', display: 'inline-block',
                    }}
                  />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>

            {/* Divider */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 24, color: '#D1D5DB',
              }}
            >
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>ou</span>
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            </div>

            {/* Lien inscription */}
            <p style={{ textAlign: 'center', fontSize: '0.88rem', color: '#666666' }}>
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                style={{
                  background: 'none', border: 'none',
                  color: O, fontWeight: 700, cursor: 'pointer',
                  fontSize: '0.88rem', padding: 0,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Créer un compte locataire
              </button>
            </p>
          </form>
        </motion.div>
      </div>

      {/* ─── Keyframes ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes floatCircle {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-16px) scale(1.04); }
        }
        @keyframes sf-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sf-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes sf-circle {
          from { stroke-dashoffset: 302; }
          to   { stroke-dashoffset: 0;   }
        }
        @keyframes sf-check {
          from { stroke-dashoffset: 80; }
          to   { stroke-dashoffset: 0;  }
        }
        @keyframes sf-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes sf-bar {
          from { width: 0%;    }
          to   { width: 100%;  }
        }
        @keyframes sf-pulse {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
