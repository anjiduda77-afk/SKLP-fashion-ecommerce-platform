import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiX, FiSend, FiZap, FiUser, FiMic } from 'react-icons/fi'
import { useTheme } from '@context/ThemeContext'
import { useVoiceSearch } from '@hooks/useVoiceSearch'

const quickPrompts = [
  'Curate a wedding evening look',
  'Latest sneakers in gold couture',
  'Recommend a velvet blazer look',
  'Size and fit guidance'
]

function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const { isDarkMode } = useTheme()
  const chatEndRef = useRef(null)
  
  const [history, setHistory] = useState([
    { 
      from: 'bot', 
      text: 'Hello! Welcome to Style Street Customer Support. We can help you explore outfits, sarees, blazers, shoes, check sizes, and assist with order questions. How may we assist you today?' 
    }
  ])

  // Automatically scroll chat to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, open])

  // Listen to global open event
  useEffect(() => {
    const handleOpenChat = () => setOpen(true)
    window.addEventListener('open-chatbot', handleOpenChat)
    return () => window.removeEventListener('open-chatbot', handleOpenChat)
  }, [])

  const { isListening: isVoiceListening, start: startVoice, stop: stopVoice } = useVoiceSearch({
    onResult: (text) => {
      if (text?.trim()) {
        sendMessage(text.trim())
      }
    }
  })

  const sendMessage = (text) => {
    if (!text.trim()) return
    
    // Add user message
    setHistory((prev) => [...prev, { from: 'user', text }])
    setMessage('')
    
    // Simulate assistant thinking and replying
    setTimeout(() => {
      let reply = `Here are some popular options for "${text}". I recommend checking our festive sarees, blazers, and sneakers. Let me know if you would like to see any specific category!`
      
      const query = text.toLowerCase()
      if (query.includes('wedding') || query.includes('evening') || query.includes('look') || query.includes('party')) {
        reply = 'For weddings and festive occasions, I highly recommend our **Royal Banarasi Silk Saree** (₹14,999) or our **Velvet Evening Blazer** (₹8,999). Would you like me to show these collections?'
      } else if (query.includes('sneaker') || query.includes('shoe') || query.includes('footwear')) {
        reply = 'Our **Gold Trim Leather Sneakers** (₹2,499) combine everyday comfort with stylish gold accents. They pair great with jeans, hoodies, and casual outfits.'
      } else if (query.includes('blazer') || query.includes('velvet') || query.includes('men')) {
        reply = 'The **Premium Velvet Blazer** (₹8,999) features rich velvet texture and a comfortable tailored fit. It is one of our best sellers in Men\'s collection.'
      } else if (query.includes('size') || query.includes('sizing') || query.includes('fit')) {
        reply = 'We recommend choosing your standard size. Our Banarasi sarees are standard length (5.5 metres) with an included 0.8-metre unstitched blouse piece.'
      }

      setHistory((prev) => [...prev, { from: 'bot', text: reply }])
    }, 800)
  }

  return (
    <div className="fixed bottom-20 right-3.5 z-40 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8">
      
      {/* Expanded Chat Overlay Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed inset-x-3 bottom-20 sm:static sm:inset-auto w-auto sm:w-[350px] max-w-[calc(100vw-1.5rem)] max-h-[72vh] sm:max-h-none rounded-3xl sm:rounded-[2.2rem] border overflow-hidden shadow-2xl flex flex-col mb-2 sm:mb-4
              ${isDarkMode 
                ? 'bg-luxury-black/98 border-white/10 text-white shadow-dark-glow' 
                : 'bg-white/98 border-luxury-gold/30 text-luxury-darkBlack shadow-hover'
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-5 border-b border-current/10">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-luxury-gold to-luxury-lightGold flex items-center justify-center text-black font-extrabold shadow-glow">
                  <FiMessageCircle size={15} />
                </div>
                <div>
                  <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.25em] text-luxury-gold font-bold">STYLE STREET SUPPORT</p>
                  <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase font-serif">Shopping Help</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setOpen(false)} 
                className={`p-1.5 sm:p-2 rounded-full border transition-all
                  ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-luxury-gold' : 'bg-luxury-offWhite hover:bg-luxury-lightGray'}`}
                aria-label="Close support chat"
              >
                <FiX size={15} />
              </button>
            </div>

            {/* Conversation Log */}
            <div className="flex-1 max-h-60 sm:max-h-80 overflow-y-auto p-3.5 sm:p-5 space-y-3 sm:space-y-4 scrollbar-thin">
              {history.map((entry, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-2 sm:gap-2.5 max-w-[88%] ${entry.from === 'bot' ? 'self-start' : 'ml-auto flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs shrink-0
                    ${entry.from === 'bot' 
                      ? 'bg-luxury-gold text-black shadow-glow' 
                      : isDarkMode ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}
                  >
                    {entry.from === 'bot' ? <FiMessageCircle size={11} /> : <FiUser size={11} />}
                  </div>

                  {/* Message Bubble */}
                  <div 
                    className={`rounded-2xl sm:rounded-[1.6rem] p-2.5 sm:p-3 text-[11px] sm:text-xs leading-relaxed border
                      ${entry.from === 'bot' 
                        ? isDarkMode ? 'bg-white/5 border-white/5 text-white/90' : 'bg-luxury-offWhite border-black/5 text-slate-800'
                        : isDarkMode ? 'bg-luxury-gold/10 border-luxury-gold/20 text-luxury-gold' : 'bg-luxury-gold text-black border-luxury-gold/30'
                      }`}
                  >
                    <p>{entry.text}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Recommended Triggers */}
            <div className="px-3.5 sm:px-5 pb-2.5 pt-1">
              <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-luxury-gold font-bold mb-1.5">Suggested Questions</p>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className={`text-[9px] sm:text-[10px] font-semibold rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 border transition-all text-left
                      ${isDarkMode 
                        ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-luxury-gold/40' 
                        : 'bg-black/5 border-black/5 text-slate-700 hover:bg-luxury-gold/10 hover:border-luxury-gold/40'
                      }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Footer */}
            <div className="p-3 sm:p-4 border-t border-current/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask a question about styles, orders or sizes..."
                  className={`w-full rounded-xl sm:rounded-2xl border px-3 sm:px-4 py-2 sm:py-3 text-xs outline-none focus:ring-1 focus:ring-luxury-gold text-current bg-transparent
                    ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(message)}
                />
                <button
                  type="button"
                  onClick={() => isVoiceListening ? stopVoice() : startVoice()}
                  className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl transition-all active:scale-95 ${
                    isVoiceListening 
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/40' 
                      : isDarkMode 
                        ? 'bg-white/10 text-luxury-gold hover:bg-white/15 border border-white/10' 
                        : 'bg-black/5 text-luxury-darkBlack hover:bg-luxury-gold/15 border border-black/10'
                  }`}
                  title={isVoiceListening ? "Listening... Tap to stop" : "Voice search"}
                  aria-label="Voice input"
                >
                  <FiMic size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => sendMessage(message)}
                  className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-luxury-gold text-black transition hover:bg-luxury-darkGold shadow-glow active:scale-95"
                  title="Send message"
                >
                  <FiSend size={14} />
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Circle Icon */}
      <motion.button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-luxury-gold via-luxury-darkGold to-luxury-lightGold text-black shadow-glow transition-all active:scale-95"
        aria-label="Customer Support"
      >
        <FiMessageCircle className="text-xl sm:text-2xl" />
      </motion.button>

    </div>
  )
}

export default AIChatbot
