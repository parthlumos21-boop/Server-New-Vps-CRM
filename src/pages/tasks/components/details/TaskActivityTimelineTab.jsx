import React, { useMemo } from 'react'

export default function TaskActivityTimelineTab({
  activities = [],
  searchFilter = '',
}) {
  const filteredActivities = useMemo(() => {
    if (!searchFilter.trim()) return activities
    const query = searchFilter.toLowerCase().trim()
    return activities.filter((act) => {
      const text = `${act.actorName || ''} ${act.actionText || ''} ${act.targetText || ''} ${act.snippet || ''} ${(act.chips || []).join(' ')}`.toLowerCase()
      return text.includes(query)
    })
  }, [activities, searchFilter])

  // Group activities by date
  const grouped = useMemo(() => {
    const groups = {}
    filteredActivities.forEach((act) => {
      const d = act.createdAt ? new Date(act.createdAt) : new Date()
      const dateKey = d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      })
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(act)
    })
    return groups
  }, [filteredActivities])

  const dateKeys = Object.keys(grouped)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1.25rem 1.75rem',
        overflowY: 'auto',
        gap: '1.5rem',
      }}
    >
      {dateKeys.length === 0 ? (
        <div
          style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.84rem',
            fontStyle: 'italic',
          }}
        >
          {searchFilter ? 'No activity matches your search.' : 'No activity logged yet.'}
        </div>
      ) : (
        dateKeys.map((dateStr) => {
          const items = grouped[dateStr]
          return (
            <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Date Group Heading */}
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>{dateStr}</span>
              </div>

              {/* Items in date group */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  paddingLeft: '0.5rem',
                  borderLeft: '2px solid #e2e8f0',
                  marginLeft: '0.4rem',
                }}
              >
                {items.map((act) => {
                  const timeStr = act.createdAt
                    ? new Date(act.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      }).toLowerCase()
                    : 'just now'

                  const initials = (act.actorName || 'User')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()

                  return (
                    <div
                      key={act.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        fontSize: '0.78rem',
                        lineHeight: '1.45',
                        position: 'relative',
                        paddingLeft: '0.5rem',
                      }}
                    >
                      {/* Timeline dot */}
                      <span
                        style={{
                          position: 'absolute',
                          left: '-13px',
                          top: '6px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#c60016',
                          border: '2px solid #ffffff',
                          boxShadow: '0 0 0 1px #fecdd3',
                        }}
                      />

                      {/* Time */}
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: '#94a3b8',
                          width: '56px',
                          flexShrink: 0,
                          paddingTop: '2px',
                        }}
                      >
                        {timeStr}
                      </span>

                      {/* Actor Avatar */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          fontSize: '0.62rem',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        {initials}
                      </div>

                      {/* Activity Sentence */}
                      <div style={{ flex: 1, color: '#334155' }}>
                        <span
                          style={{
                            fontWeight: '700',
                            color: '#1e40af',
                            backgroundColor: '#eff6ff',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #dbeafe',
                            marginRight: '0.35rem',
                            fontSize: '0.74rem',
                          }}
                        >
                          {act.actorName}
                        </span>

                        <span>{act.actionText}</span>

                        {act.pill && (
                          <span
                            style={{
                              marginLeft: '0.35rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: '700',
                              fontSize: '0.72rem',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                            }}
                          >
                            {act.pill}
                          </span>
                        )}

                        {act.targetText && (
                          <span
                            style={{
                              marginLeft: '0.35rem',
                              fontWeight: '700',
                              color: '#0f172a',
                            }}
                          >
                            &ldquo;{act.targetText}&rdquo;
                          </span>
                        )}

                        {act.snippet && (
                          <div
                            style={{
                              marginTop: '0.25rem',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.76rem',
                              color: '#475569',
                            }}
                          >
                            {act.snippet}
                          </div>
                        )}

                        {Array.isArray(act.chips) && act.chips.length > 0 && (
                          <div
                            style={{
                              display: 'inline-flex',
                              flexWrap: 'wrap',
                              gap: '0.25rem',
                              marginLeft: '0.35rem',
                              verticalAlign: 'middle',
                            }}
                          >
                            {act.chips.map((name, i) => (
                              <span
                                key={i}
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  backgroundColor: '#fff7ed',
                                  border: '1px solid #fed7aa',
                                  color: '#c2410c',
                                  fontWeight: '600',
                                }}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
