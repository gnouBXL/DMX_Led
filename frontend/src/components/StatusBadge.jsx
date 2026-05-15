export default function StatusBadge({ online }) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 500,
        background: online ? '#14532d' : '#1c1c1c',
        color: online ? '#86efac' : '#555',
        border: `1px solid ${online ? '#166534' : '#2a2a2a'}`,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: online ? '#4ade80' : '#444',
        }}/>
        {online ? 'En ligne' : 'Hors ligne'}
      </span>
    )
  }