import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User, Mail, Lock, Phone, Eye, EyeOff,
  CheckCircle, AlertCircle, Hash,
} from 'lucide-react'
import axios from 'axios'

const O = '#E8520A'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inp = (err) => ({
  width: '100%', padding: '11px 14px 11px 42px', boxSizing: 'border-box',
  border: `1.5px solid ${err ? '#FCA5A5' : '#E5E7EB'}`,
  background: err ? '#FFF5F5' : '#FAFAFA',
  borderRadius: 10, fontSize: '0.9rem', color: '#1A1A1A',
  outline: 'none', fontFamily: "'Inter', sans-serif",
  transition: 'border-color 180ms, box-shadow 180ms, background 180ms',
})
const onF = (e) => {
  e.target.style.borderColor = O
  e.target.style.boxShadow = '0 0 0 3px rgba(232,82,10,0.12)'
  e.target.style.background = '#FFFFFF'
}
const onB = (e) => {
  e.target.style.borderColor = '#E5E7EB'
  e.target.style.boxShadow = 'none'
  e.target.style.background = '#FAFAFA'
}

function Field({ label, required, error, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: O, marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && (
          <span style={{
            position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
            color: '#9CA3AF', display: 'flex', pointerEvents: 'none',
          }}>
            <Icon size={16} />
          </span>
        )}
        {children}
      </div>
      {error && (
        <p style={{ fontSize: '0.74rem', color: '#EF4444', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

const EMPTY = {
  prenom: '', nom: '', email: '', telephone: '',
  motDePasse: '', confirmMotDePasse: '',
  typeLocataire: '', numeroMatricule: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm]         = useState(EMPTY)
  const [errs, setErrs]         = useState({})
  const [showPwd, setShowPwd]   = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess]   = useState(false)

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    setErrs(p => ({ ...p, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.prenom.trim())   e.prenom = 'Champ requis'
    if (!form.nom.trim())      e.nom    = 'Champ requis'
    if (!form.email.trim())    e.email  = 'Champ requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide'
    if (!form.typeLocataire)   e.typeLocataire = 'Veuillez choisir votre statut'
    if (!form.motDePasse)      e.motDePasse = 'Champ requis'
    else if (form.motDePasse.length < 8) e.motDePasse = 'Minimum 8 caractères'
    if (!form.confirmMotDePasse)         e.confirmMotDePasse = 'Champ requis'
    else if (form.motDePasse !== form.confirmMotDePasse) e.confirmMotDePasse = 'Les mots de passe ne correspondent pas'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length) { setErrs(errors); return }
    setLoading(true)
    setApiError('')
    try {
      await axios.post('/api/auth/register', {
        prenom:          form.prenom.trim(),
        nom:             form.nom.trim(),
        email:           form.email.trim(),
        telephone:       form.telephone.trim() || undefined,
        motDePasse:      form.motDePasse,
        typeLocataire:   form.typeLocataire,
        numeroMatricule: form.typeLocataire === 'FONCTIONNAIRE' ? (form.numeroMatricule.trim() || undefined) : undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2200)
    } catch (err) {
      setApiError(err.response?.data?.message || 'Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F9FAFB', fontFamily: "'Inter', sans-serif", padding: '40px 24px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <CheckCircle size={72} style={{ color: '#22c55e', marginBottom: 20 }} />
          </motion.div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
            Compte créé avec succès !
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: '0 0 6px' }}>
            Votre demande a bien été enregistrée.
          </p>
          <p style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>
            Redirection vers la connexion…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F9FAFB',
      display: 'flex', fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── Colonne gauche (desktop) ──────────────────────────────────── */}
      <div
        className="hidden md:flex"
        style={{
          flex: '0 0 42%', background: O,
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '48px 40px', position: 'relative', overflow: 'hidden',
        }}
      >
        {[
          { size: 500, top: -180, right: -180, opacity: 0.06 },
          { size: 320, top: -80,  right: -80,  opacity: 0.08 },
          { size: 400, bottom: -160, left: -160, opacity: 0.06 },
        ].map((c, i) => (
          <div key={i} aria-hidden style={{
            position: 'absolute', borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.18)',
            background: `rgba(255,255,255,${c.opacity})`,
            width: c.size, height: c.size,
            top: c.top, right: c.right, bottom: c.bottom, left: c.left,
            pointerEvents: 'none',
          }} />
        ))}

        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            background: '#FFFFFF', borderRadius: 16,
            padding: '16px 24px', marginBottom: 36,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', position: 'relative', zIndex: 1,
          }}
        >
          <img
            src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg"
            alt="SONAPIE"
            style={{ width: 200, height: 'auto', display: 'block', mixBlendMode: 'multiply' }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{
            color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 600,
            textAlign: 'center', lineHeight: 1.55, marginBottom: 32,
            maxWidth: 300, position: 'relative', zIndex: 1,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Accédez à votre logement SONAPIE en quelques étapes
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}
        >
          {[
            'Créez votre compte locataire',
            'Déposez votre demande de logement',
            'Suivez l\'avancement en temps réel',
            'Signalez des pannes facilement',
          ].map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={17} style={{ color: '#FFFFFF', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.88rem' }}>{p}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Colonne droite — formulaire ───────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 24px', background: '#FFFFFF', overflowY: 'auto',
      }}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 440, paddingBottom: 32 }}
        >
          {/* Logo mobile */}
          <div className="md:hidden" style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src="/WhatsApp Image 2026-06-11 at 12.53.19.jpeg"
              alt="SONAPIE"
              style={{ width: 160, height: 'auto', display: 'inline-block', mixBlendMode: 'multiply' }}
            />
          </div>

          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '1.75rem', fontWeight: 700,
            color: '#1A1A1A', margin: '0 0 4px',
          }}>
            Créer un compte
          </h1>
          <p style={{ color: '#666666', fontSize: '0.88rem', margin: '0 0 28px' }}>
            Remplissez le formulaire pour accéder aux services SONAPIE
          </p>

          <form onSubmit={handleSubmit} noValidate>

            {/* ── Statut locataire ───────────────────────────────────── */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Vous êtes <span style={{ color: O }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { value: 'PRIVE',        label: 'Locataire Privé',        sub: 'Secteur privé' },
                  { value: 'FONCTIONNAIRE', label: 'Fonctionnaire',          sub: 'Secteur public' },
                ].map(opt => {
                  const active = form.typeLocataire === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setForm(p => ({ ...p, typeLocataire: opt.value, numeroMatricule: '' })); setErrs(p => ({ ...p, typeLocataire: '' })) }}
                      style={{
                        flex: 1, padding: '12px 10px', border: `2px solid ${active ? O : '#E5E7EB'}`,
                        borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                        background: active ? '#FFF7ED' : '#FAFAFA',
                        transition: 'all 180ms',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: `2px solid ${active ? O : '#D1D5DB'}`,
                          background: active ? O : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFFFFF' }} />}
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? O : '#374151' }}>
                          {opt.label}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '0 0 0 22px' }}>
                        {opt.sub}
                      </p>
                    </button>
                  )
                })}
              </div>
              {errs.typeLocataire && (
                <p style={{ fontSize: '0.74rem', color: '#EF4444', margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={11} /> {errs.typeLocataire}
                </p>
              )}
            </div>

            {/* Numéro de matricule (fonctionnaire uniquement) */}
            {form.typeLocataire === 'FONCTIONNAIRE' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Field label="Numéro de matricule" icon={Hash}>
                  <input
                    placeholder="Ex : FP-2024-00123"
                    value={form.numeroMatricule}
                    onChange={set('numeroMatricule')}
                    onFocus={onF} onBlur={onB}
                    style={inp(false)}
                  />
                </Field>
              </motion.div>
            )}

            {/* ── Identité ───────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Prénom" required error={errs.prenom} icon={User}>
                  <input
                    value={form.prenom} onChange={set('prenom')}
                    onFocus={onF} onBlur={onB} style={inp(errs.prenom)}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Nom" required error={errs.nom} icon={User}>
                  <input
                    value={form.nom} onChange={set('nom')}
                    onFocus={onF} onBlur={onB} style={inp(errs.nom)}
                  />
                </Field>
              </div>
            </div>

            <Field label="Adresse email" required error={errs.email} icon={Mail}>
              <input
                type="email" value={form.email} onChange={set('email')}
                onFocus={onF} onBlur={onB} style={inp(errs.email)}
                placeholder="votre@email.com"
              />
            </Field>

            <Field label="Numéro de téléphone" icon={Phone}>
              <input
                type="tel" value={form.telephone} onChange={set('telephone')}
                onFocus={onF} onBlur={onB} style={inp(false)}
                placeholder="+225 07 00 00 00 00"
              />
            </Field>

            {/* ── Mot de passe ───────────────────────────────────────── */}
            <Field label="Mot de passe" required error={errs.motDePasse} icon={Lock}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.motDePasse} onChange={set('motDePasse')}
                onFocus={onF} onBlur={onB}
                style={{ ...inp(errs.motDePasse), paddingRight: 42 }}
                placeholder="Minimum 8 caractères"
              />
              <button
                type="button" onClick={() => setShowPwd(p => !p)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94A3B8', display: 'flex', padding: 0,
                }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>

            <Field label="Confirmer le mot de passe" required error={errs.confirmMotDePasse} icon={Lock}>
              <input
                type={showPwd2 ? 'text' : 'password'}
                value={form.confirmMotDePasse} onChange={set('confirmMotDePasse')}
                onFocus={onF} onBlur={onB}
                style={{ ...inp(errs.confirmMotDePasse), paddingRight: 42 }}
                placeholder="Répétez le mot de passe"
              />
              <button
                type="button" onClick={() => setShowPwd2(p => !p)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94A3B8', display: 'flex', padding: 0,
                }}
              >
                {showPwd2 ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>

            {/* Erreur API */}
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 10, padding: '11px 14px', marginBottom: 16,
                }}
              >
                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', color: '#DC2626' }}>{apiError}</span>
              </motion.div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#f0956a' : O,
                color: '#FFFFFF', border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: '0.95rem',
                fontFamily: "'Inter', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 200ms',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(232,82,10,0.25)',
                marginBottom: 20,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#c4430a' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = loading ? '#f0956a' : O }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#FFFFFF', borderRadius: '50%',
                    animation: 'spin .7s linear infinite', display: 'inline-block',
                  }} />
                  Création en cours…
                </>
              ) : 'Créer mon compte'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.88rem', color: '#666666' }}>
              Déjà un compte ?{' '}
              <button
                type="button" onClick={() => navigate('/login')}
                style={{
                  background: 'none', border: 'none', color: O,
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
                  padding: 0, fontFamily: "'Inter', sans-serif",
                }}
              >
                Se connecter
              </button>
            </p>
          </form>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
