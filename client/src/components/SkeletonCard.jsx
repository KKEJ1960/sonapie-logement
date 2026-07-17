export default function SkeletonCard() {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 16,
      padding: '18px 20px', border: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E5E7EB', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 16, borderRadius: 6, background: '#E5E7EB', width: '75%' }} />
          <div style={{ height: 12, borderRadius: 6, background: '#F1F5F9', width: '50%' }} />
        </div>
      </div>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
