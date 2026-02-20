import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, InteractionContent } from './types';
import DiscoveryCanvas from './components/DiscoveryCanvas';
import { murahoAI } from './services/geminiService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLive, setIsLive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState<{ text: string, isModel: boolean } | null>(null);
  const [activeLang, setActiveLang] = useState('Auto');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Simple mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Force close menu when switching to desktop
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Simple body scroll lock
  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      document.body.classList.add('overflow-hidden', 'fixed', 'w-full');
    } else {
      document.body.classList.remove('overflow-hidden', 'fixed', 'w-full');
    }
  }, [isMobile, isMobileMenuOpen]);

  // Simple click outside handler
  useEffect(() => {
    if (!isMobile || !isMobileMenuOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;

      // Don't close if clicking menu button
      if (menuButtonRef.current?.contains(target)) {
        return;
      }

      // Don't close if clicking sidebar
      if (sidebarRef.current?.contains(target)) {
        return;
      }

      setIsMobileMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobile, isMobileMenuOpen]);

  // Cleanup
  useEffect(() => {
    return () => {
      document.body.classList.remove('overflow-hidden', 'fixed', 'w-full');
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLive = async () => {
    if (isLive) {
      if (liveSessionRef.current) {
        liveSessionRef.current.close();
      }
      setIsLive(false);
      setLiveTranscription(null);
    } else {
      setIsLive(true);
      try {
        const session = await murahoAI.connectLive({
          onTranscription: (text, isModel) => {
            setLiveTranscription({ text, isModel });
          },
          onClose: () => {
            setIsLive(false);
            setLiveTranscription(null);
          }
        });
        liveSessionRef.current = session;
      } catch (err) {
        console.error(err);
        setIsLive(false);
      }
    }
  };

  const handleSendMessage = async (text?: string, file?: { data: string, type: string }) => {
    const messageText = text || inputValue;
    if (!messageText.trim() && !file) return;

    const userContent: InteractionContent[] = [];
    if (messageText.trim()) userContent.push({ type: 'text', text: messageText });
    if (file) {
      userContent.push({
        type: file.type.startsWith('image') ? 'image' : 'document',
        data: file.data.split(',')[1],
        mime_type: file.type
      });
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Close mobile menu
    setIsMobileMenuOpen(false);

    try {
      const interaction = await murahoAI.createInteraction({
        input: userContent,
        tools: [{ googleSearch: {} }],
        language: activeLang
      });

      const modelMsg: ChatMessage = {
        id: `model_${Date.now()}`,
        role: 'model',
        content: interaction.outputs,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);

      const textOutput = interaction.outputs.find(o => o.type === 'text')?.text;
      if (textOutput && textOutput.length < 250) {
        handlePlayAudio(textOutput);
      }
    } catch (error) {
      console.error("Concierge Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePlayAudio = async (text: string) => {
    setIsSpeaking(true);
    await murahoAI.speak(text);
    setIsSpeaking(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleSendMessage(`Analyzing visual information...`, {
          data: reader.result as string,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative h-screen flex bg-[#fcfcfc] text-slate-900 overflow-hidden font-['Outfit']">
      {/* Ambient Visuals */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-400/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-400/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden md:flex w-80 border-r border-slate-100 flex-col z-20 bg-white/50 backdrop-blur-md">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-200">
              <i className="fas fa-leaf text-white text-xs"></i>
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase">Muraho<span className="text-emerald-600">AI</span></h1>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Bujumbura Digital Hub</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-8">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">Language Select</h3>
            <div className="grid grid-cols-2 gap-2 px-2">
              {['English', 'Français', 'Kirundi', 'Auto'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${activeLang === lang
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'
                    }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">Local Context</h3>
            <div className="grid gap-3 px-2">
              <div className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Time in Buja</p>
                  <p className="font-bold text-lg">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <i className="fas fa-clock text-emerald-500 opacity-20 text-2xl"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className={`p-6 rounded-3xl transition-all ${isLive ? 'bg-red-500 shadow-lg shadow-red-200' : 'bg-slate-900 shadow-xl'}`}>
            <div className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Voice Command</div>
            <div className="flex items-center justify-between">
              <p className="text-white font-bold text-sm">{isLive ? 'Live Listening...' : 'Press Mic for Voice'}</p>
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-white animate-ping' : 'bg-emerald-500'}`}></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header - Only on Mobile */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-4 py-3 z-40 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            ref={menuButtonRef}
            className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center active:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <i className="fas fa-bars text-slate-700"></i>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-leaf text-white text-xs"></i>
            </div>
            <h1 className="text-base font-black tracking-tighter uppercase">Muraho<span className="text-emerald-600">AI</span></h1>
          </div>
          <button
            onClick={toggleLive}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isLive ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-700 active:bg-slate-100'
              }`}
            aria-label="Toggle voice"
          >
            <i className={`fas fa-microphone ${isLive ? 'animate-pulse' : ''}`}></i>
          </button>
        </div>
      )}

      {/* Mobile Sidebar - SIMPLIFIED, NO FANCY ANIMATIONS */}
      {isMobile && isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar */}
          <div
            ref={sidebarRef}
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white z-50 shadow-2xl overflow-y-auto"
            style={{
              animation: 'slideIn 0.25s ease-out'
            }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="sticky top-0 bg-white z-10 p-6 pb-4 flex justify-between items-start border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <i className="fas fa-leaf text-white text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tighter uppercase">Muraho<span className="text-emerald-600">AI</span></h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bujumbura Digital Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center active:bg-slate-200 transition-colors"
                  aria-label="Close menu"
                >
                  <i className="fas fa-times text-slate-500"></i>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                {/* Language Section */}
                <div className="mb-8">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Language</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['English', 'Français', 'Kirundi', 'Auto'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => {
                          setActiveLang(lang);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${activeLang === lang
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                          : 'bg-white border-slate-200 text-slate-500 active:bg-slate-50'
                          }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Local Time */}
                <div className="mb-8">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Local Time</h3>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Bujumbura</p>
                      <p className="font-bold text-2xl text-slate-800">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-clock text-emerald-600 text-xl"></i>
                    </div>
                  </div>
                </div>

                {/* Voice Status */}
                <div className="mt-auto">
                  <div className={`p-5 rounded-2xl transition-all ${isLive ? 'bg-red-500' : 'bg-slate-900'}`}>
                    <div className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Voice Command</div>
                    <div className="flex items-center justify-between">
                      <p className="text-white font-semibold text-sm">{isLive ? '● Live Listening' : '🎤 Ready for voice'}</p>
                      <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-emerald-400'}`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Mobile padding for fixed header */}
        <div className={`flex-1 flex flex-col min-h-0 ${isMobile ? 'pt-[60px]' : ''}`}>
          <DiscoveryCanvas messages={messages} isTyping={isTyping} onPlayAudio={handlePlayAudio} />
        </div>

        {/* Live Interaction Overlay */}
        <AnimatePresence>
          {isLive && liveTranscription && (
            <motion.div
              key="live-overlay"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-white/60 backdrop-blur-xl z-[60] flex flex-col items-center justify-center p-6 md:p-12 text-center"
            >
              <div className="flex gap-1 md:gap-2 mb-8 md:mb-12">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [20, 60, 20] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                    className="w-1 md:w-2 bg-emerald-600 rounded-full"
                  ></motion.div>
                ))}
              </div>
              <h2 className="text-[10px] md:text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] md:tracking-[0.4em] mb-4">Live Transcription</h2>
              <p className={`text-xl md:text-2xl lg:text-4xl font-medium max-w-3xl leading-tight ${liveTranscription.isModel ? 'text-slate-800 italic' : 'text-emerald-900'
                }`}>
                {liveTranscription.text || "I'm listening..."}
              </p>
              <button
                onClick={toggleLive}
                className="mt-8 md:mt-12 w-16 h-16 md:w-20 md:h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-200 active:scale-95 hover:scale-110 transition-transform"
              >
                <i className="fas fa-stop text-xl md:text-2xl"></i>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="p-4 md:p-6 lg:p-10 bg-white/80 backdrop-blur-2xl border-t border-slate-100/50">
          <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-4 bg-white p-1 md:p-2 pl-4 md:pl-6 rounded-full shadow-xl border border-slate-100">
            <button
              onClick={toggleLive}
              className={`hidden md:flex w-10 md:w-12 h-10 md:h-12 rounded-full items-center justify-center transition-all ${isLive ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
            >
              <i className="fas fa-microphone text-lg md:text-xl"></i>
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isMobile ? "Ask Muraho..." : "Ask Muraho about Bujumbura..."}
              className="flex-1 bg-transparent border-none focus:ring-0 text-xs md:text-sm font-medium outline-none py-3 md:py-2 placeholder:text-slate-400"
            />
            <label className="cursor-pointer p-2 md:p-3 hover:bg-slate-50 rounded-full transition-colors group active:bg-slate-100">
              <i className="fas fa-paperclip text-sm md:text-base text-slate-400 group-hover:text-emerald-500"></i>
              <input type="file" className="hidden" onChange={onFileChange} accept="image/*" />
            </label>
            <button
              onClick={() => handleSendMessage()}
              disabled={isTyping}
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 active:bg-emerald-800"
            >
              <i className={`fas text-sm md:text-base ${isTyping ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`}></i>
            </button>
          </div>
        </div>
      </main>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        @media (max-width: 768px) {
          input, button {
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
};

export default App;