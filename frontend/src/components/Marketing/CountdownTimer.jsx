import { useState, useEffect, useMemo } from 'react'
import { FiClock } from 'react-icons/fi'

export default function CountdownTimer({ startDate, endDate, onExpire, className = '' }) {
  const [timeLeft, setTimeLeft] = useState(null)
  const [stage, setStage] = useState('upcoming') // 'upcoming' | 'live' | 'ended'

  const targetDates = useMemo(() => ({
    start: startDate ? new Date(startDate).getTime() : null,
    end: endDate ? new Date(endDate).getTime() : null
  }), [startDate, endDate])

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now()
      const { start, end } = targetDates

      let targetTime = null
      let currentStage = 'live'

      if (start && now < start) {
        currentStage = 'upcoming'
        targetTime = start
      } else if (end && now < end) {
        currentStage = 'live'
        targetTime = end
      } else {
        currentStage = 'ended'
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        setStage('ended')
        if (onExpire) onExpire()
        return
      }

      setStage(currentStage)

      const difference = targetTime - now
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        setStage('ended')
        if (onExpire) onExpire()
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [targetDates, onExpire])

  if (!timeLeft || stage === 'ended') {
    return null
  }

  const label = stage === 'upcoming' ? 'SALE STARTS IN' : 'SALE ENDS IN'

  return (
    <div className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-amber-400/30 text-white shadow-lg ${className}`}>
      <div className="flex items-center gap-1.5 text-luxury-gold font-bold text-[10px] tracking-wider uppercase">
        <FiClock className="animate-pulse" size={13} />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1 font-mono text-xs font-black">
        {timeLeft.days > 0 && (
          <>
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-luxury-gold">{String(timeLeft.days).padStart(2, '0')}d</span>
            <span className="text-amber-400">:</span>
          </>
        )}
        <span className="bg-white/10 px-1.5 py-0.5 rounded text-white">{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span className="text-amber-400">:</span>
        <span className="bg-white/10 px-1.5 py-0.5 rounded text-white">{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span className="text-amber-400">:</span>
        <span className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  )
}
