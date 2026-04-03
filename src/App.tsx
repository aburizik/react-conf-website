import { useState, useEffect } from 'react'
import scheduleData from '../data/schedule.json'

interface Talk {
  time: string
  title: string
  type?: string
  speakers: string[]
  description: string
  youtubeId: string
}

type Day = '2015-01-28' | '2015-01-29'

const DAY_LABELS: Record<Day, string> = {
  '2015-01-28': 'Wed, Jan 28',
  '2015-01-29': 'Thu, Jan 29',
}

/**
 * Parses a time range string like "2:30-3:00pm" into minute-of-day values.
 * The am/pm suffix applies to the end time; the start time is inferred by
 * requiring start <= end (handles the "11:30-12:00pm" am→pm boundary).
 */
function parseTalkTimeRange(timeStr: string): { start: number; end: number } {
  const match = timeStr.match(/^(\d+):(\d+)-(\d+):(\d+)(am|pm)$/)
  if (!match) return { start: 0, end: 0 }
  const [, sh, sm, eh, em, period] = match
  const startH = parseInt(sh), startM = parseInt(sm)
  const endH = parseInt(eh), endM = parseInt(em)

  const endHour24 = period === 'pm'
    ? (endH === 12 ? 12 : endH + 12)
    : (endH === 12 ? 0 : endH)

  // If adding 12 to startH still doesn't exceed endHour24, it's in the same
  // pm block. Otherwise the start is the earlier (am) side of a noon crossing.
  const startHour24 = period === 'pm'
    ? (startH + 12 <= endHour24 ? startH + 12 : startH)
    : startH

  return { start: startHour24 * 60 + startM, end: endHour24 * 60 + endM }
}

/** Returns current time as minutes since midnight, updating every minute. */
function useNow(): number {
  const toMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes()
  const [now, setNow] = useState(() => toMinutes(new Date()))

  useEffect(() => {
    const id = setInterval(() => setNow(toMinutes(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])

  return now
}

/** Returns the talk currently in progress for a given day, or null. */
function getCurrentTalk(day: Day, nowMinutes: number): Talk | null {
  // Hard-coded: always treat today as Jan 28 for demo purposes.
  // Production version: const today = new Date().toISOString().split('T')[0] as Day
  const demoDay: Day = '2015-01-28'

  if (day !== demoDay) return null

  const talks = scheduleData.schedule[demoDay] as Talk[]
  return talks.find(talk => {
    const { start, end } = parseTalkTimeRange(talk.time)
    return nowMinutes >= start && nowMinutes < end
  }) ?? null
}

export default function App() {
  const [selectedDay, setSelectedDay] = useState<Day>('2015-01-28')
  const [selectedTalk, setSelectedTalk] = useState<Talk | null>(null)
  const now = useNow()

  const days = scheduleData.conference.dates as Day[]
  const talks = scheduleData.schedule[selectedDay] as Talk[]
  const currentTalk = getCurrentTalk(selectedDay, now)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedTalk(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleDayChange(day: Day) {
    setSelectedDay(day)
    setSelectedTalk(null)
  }

  function handleTalkClick(talk: Talk) {
    setSelectedTalk(prev => prev?.title === talk.title ? null : talk)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header className="bg-[#1a1a2e] text-white px-8 py-5 shrink-0">
        <div className="max-w-screen-xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-blue-400 mb-1">January 28–29, 2015 · Facebook HQ, CA</p>
          <h1 className="text-2xl font-bold">{scheduleData.conference.name}</h1>
        </div>
      </header>

      {/* Day tabs */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-screen-xl mx-auto px-8 flex">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => handleDayChange(day)}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                selectedDay === day
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      {/* Main content: schedule + sidebar */}
      <div className="flex flex-1 overflow-hidden max-w-screen-xl mx-auto w-full">

        {/* Schedule list */}
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-gray-100">
            {talks.map((talk, i) => {
              const isSelected = selectedTalk?.title === talk.title
              const isLive = currentTalk?.title === talk.title
              const next = talks[i + 1]
              const gapMinutes = next
                ? parseTalkTimeRange(next.time).start - parseTalkTimeRange(talk.time).end
                : 0
              if (talk.type === 'event') return (
                <li key={i}>
                  <div className="flex items-center gap-4 px-8 py-2 bg-gray-50 border-t border-gray-100">
                    <span className="text-xs text-gray-400 w-28 shrink-0 tabular-nums">{talk.time}</span>
                    <span className="text-xs text-gray-400">{talk.title}</span>
                  </div>
                </li>
              )

              return (
                <li key={i}>
                  <button
                    onClick={() => handleTalkClick(talk)}
                    className={`w-full text-left px-8 py-5 flex items-start gap-6 transition-colors cursor-pointer border-l-4 ${
                      isLive
                        ? 'border-l-green-400 bg-green-50 hover:bg-green-100'
                        : isSelected
                        ? 'border-l-blue-400 bg-blue-50'
                        : 'border-l-transparent bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs text-gray-400 w-28 shrink-0 pt-1 tabular-nums">{talk.time}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium leading-snug ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                          {talk.title}
                        </p>
                        {isLive && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Now
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{talk.speakers.join(', ')}</p>
                    </div>
                    <span className={`text-lg mt-0.5 transition-transform shrink-0 ${isSelected ? 'text-blue-400 rotate-90' : 'text-gray-300'}`}>›</span>
                  </button>
                  {gapMinutes > 0 && (
                    <div className="flex items-center gap-4 px-8 py-2 bg-gray-50 border-t border-gray-100">
                      <span className="text-xs text-gray-400 w-28 shrink-0 tabular-nums">
                        {gapMinutes} min
                      </span>
                      <span className="text-xs text-gray-400">
                        {gapMinutes >= 60 ? 'Lunch break' : 'Break'}
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Sliding sidebar */}
        <div
          className="shrink-0 border-l border-gray-200 bg-white overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: selectedTalk ? '440px' : '0px' }}
        >
          {selectedTalk && (
            <div className="w-[440px] h-full overflow-y-auto">
              <div className="p-6">
                {/* Sidebar header */}
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">{selectedTalk.time}</p>
                    <h2 className="text-base font-semibold text-gray-900 leading-snug">{selectedTalk.title}</h2>
                    <p className="text-sm text-blue-600 mt-1">{selectedTalk.speakers.join(', ')}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTalk(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0 cursor-pointer mt-0.5"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed mb-5">{selectedTalk.description}</p>

                {/* YouTube embed */}
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    key={selectedTalk.youtubeId}
                    src={`https://www.youtube.com/embed/${selectedTalk.youtubeId}`}
                    title={selectedTalk.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
