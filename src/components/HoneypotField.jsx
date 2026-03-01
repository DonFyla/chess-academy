'use client'

/**
 * Honeypot field - invisible to humans, traps bots
 * Bots typically fill out all fields in a form
 * If this field has a value, it's likely a bot
 */
export default function HoneypotField({ value, onChange }) {
  return (
    <div 
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        opacity: 0,
        height: 0,
        width: 0,
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <label htmlFor="website">Website</label>
      <input
        type="text"
        id="website"
        name="website"
        tabIndex="-1"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
