import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiX, FiSend, FiZap, FiUser } from 'react-icons/fi'
import { useTheme } from '@context/ThemeContext'

const quickPrompts = [
  'Curate a wedding evening look',
  'Latest sneakers in gold couture',
  'Recommend a velvet blazer look',
  'AI luxury sizing assistant'
]

function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const { isDarkMode } = useTheme()
  const chatEndRef = useRef(null)
  
  const [history, setHistory] = useState([
    { 
      from: 'bot', 
      text: 'Greetings. I am your personal SKLP AI Couturier. I can assist you with selecting bespoke items, curating outfits, or previewing our latest couture drops. What can I design for you today?' 
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

  const sendMessage = (text) => {
    if (!text.trim()) return
    
    // Add user message
    setHistory((prev) => [...prev, { from: 'user', text }])
    setMessage('')
    
    // Simulate AI thinking and replying
    setTimeout(() => {
      let reply = `I have analyzed our luxury inventory. For "${text}", I recommend matching our premium banarasi silks with gold-trim leather sneakers or a velvet evening blazer. Let me know if you would like me to add these directly to your fitting room.`
      
      const query = text.toLowerCase()
      if (query.includes('wedding') || query.includes('evening') || query.includes('look')) {
        reply = 'For a bespoke wedding evening look, I highly recommend our **Royal Banarasi Silk Saree** in classic gold and magenta (₹14,999) or our **Velvet Evening Blazer** in deep charcoal (₹8,999) paired with Italian leather oxford boots. Would you like me to show these collections?'
      } else if (query.includes('sneaker') || query.includes('shoe') || query.includes('footwear')) {
        reply = 'Our **Gold Trim Leather Sneakers** (₹2,499) combine street-style comfort with high-fashion gold accents. They pair perfectly with our Luxe Sport Hoodies or casual track trousers.'
      } else if (query.includes('blazer') || query.includes('velvet') || query.includes('men')) {
        reply = 'The **Premium Velvet Blazer** (₹8,999) features hand-finished satin lapels, deep velvet textures, and gold internal silk linings. It is currently a bestseller in our Men\'s Couture line.'
      } else if (query.includes('size') || query.includes('sizing') || query.includes('fit')) {
        reply = 'My AI sizing engine suggests choosing your standard size for tailored garments. Our premiumBanarasi sarees are one-size-fits-all, measuring 5.5 meters with an additional 0.8-meter blouse fabric.'
      }

      setHistory((prev) => [...prev, { from: 'bot', text: reply }])
    }, 800)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8">
      
      {/* Expanded Chat Overlay Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            className={`w-[350px] max-w-[calc(100vw-2rem)] rounded-[2.2rem] border overflow-hidden shadow-2xl flex flex-col mb-4
              ${isDarkMode 
                ? 'bg-luxury-black/95 border-white/10 text-white shadow-dark-glow' 
                : 'bg-white/95 border-luxury-gold/30 text-luxury-darkBlack shadow-hover'
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-5 border-b border-current/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-luxury-gold to-luxury-lightGold flex items-center justify-center text-black font-extrabold shadow-glow animate-pulse">
                  <FiZap size={16} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-luxury-gold font-bold">SKLP AI</p>
                  <h3 className="text-sm font-bold tracking-wide uppercase font-serif">Bespoke Couturier</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setOpen(false)} 
                className={`p-2 rounded-full border transition-all
                  ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-luxury-gold' : 'bg-luxury-offWhite hover:bg-luxury-lightGray'}`}
              >
                <FiX size={15} />
              </button>
            </div>

            {/* Conversation Log */}
            <div className="flex-1 max-h-80 overflow-y-auto p-5 space-y-4 scrollbar-thin">
              {history.map((entry, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-2.5 max-w-[85%] ${entry.from === 'bot' ? 'self-start' : 'ml-auto flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0
                    ${entry.from === 'bot' 
                      ? 'bg-luxury-gold text-black shadow-glow' 
                      : isDarkMode ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}
                  >
                    {entry.from === 'bot' ? <FiZap size={12} /> : <FiUser size={12} />}
                  </div>

                  {/* Message Bubble */}
                  <div 
                    className={`rounded-[1.6rem] p-3 text-xs leading-relaxed border
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
            <div className="px-5 pb-3 pt-1">
              <p className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold mb-2">Recommended Prompts</p>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className={`text-[10px] font-semibold rounded-full px-3 py-1.5 border transition-all text-left
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
            <div className="p-4 border-t border-current/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Inquire about style directions..."
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-luxury-gold text-current bg-transparent
                    ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(message)}
                />
                <button
                  type="button"
                  onClick={() => sendMessage(message)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-luxury-gold text-black transition hover:bg-luxury-darkGold shadow-glow active:scale-95"
                >
                  <FiSend size={15} />
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
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-luxury-gold via-luxury-darkGold to-luxury-lightGold text-black shadow-glow transition-all"
        aria-label="Toggle AI assistant"
      >
        <FiMessageCircle size={28} />
      </motion.button>

    </div>
  )
}

export default AIChatbot
