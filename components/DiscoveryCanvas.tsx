import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, InteractionContent } from '../types';

interface DiscoveryCanvasProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onPlayAudio: (text: string) => void;
}

const ArtifactCard: React.FC<{ msg: ChatMessage, onPlayAudio: (text: string) => void }> = ({ msg, onPlayAudio }) => {
  const isUser = msg.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} mb-12`}
    >
      <div className={`relative ${isUser ? 'max-w-md' : 'max-w-3xl w-full'}`}>
        {isUser ? (
          <div className="bg-gray-900 text-white px-8 py-5 rounded-[2rem] rounded-tr-none shadow-2xl">
            <p className="text-lg font-medium">{msg.content[0]?.text}</p>
          </div>
        ) : (
          <div className="glass rounded-[3rem] p-1 shadow-2xl overflow-hidden">
            <div className="bg-white/40 p-8 md:p-12 rounded-[2.8rem]">
              {msg.content.map((content, idx) => (
                <div key={idx} className="space-y-6">
                  {content.type === 'text' && (
                    <div className="relative group">
                      <p className="text-xl md:text-2xl leading-relaxed text-slate-800 font-light italic">
                        "{content.text}"
                      </p>
                      <button 
                        onClick={() => onPlayAudio(content.text!)}
                        className="mt-6 flex items-center gap-3 text-emerald-600 font-bold uppercase tracking-widest text-xs hover:text-emerald-500 transition-colors"
                      >
                        <i className="fas fa-volume-up text-lg"></i>
                        Listen to Muraho
                      </button>
                    </div>
                  )}
                  {content.type === 'image' && (
                    <div className="rounded-[2rem] overflow-hidden shadow-xl border-4 border-white">
                      <img src={content.uri || `data:${content.mime_type};base64,${content.data}`} alt="Muraho Insight" className="w-full h-auto" />
                    </div>
                  )}
                  {content.type === 'function_call' && (
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                        <i className="fas fa-bolt text-2xl"></i>
                      </div>
                      <div>
                        <h4 className="font-black text-emerald-900 uppercase tracking-tight">Active Operation</h4>
                        <p className="text-emerald-700 text-sm">Processing {content.name?.replace(/_/g, ' ')} for you...</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                <span>Insight Generation 00{msg.id.slice(-1)}</span>
                <span>Bujumbura Digital Concierge v2.0</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const DiscoveryCanvas: React.FC<DiscoveryCanvasProps> = ({ messages, isTyping, onPlayAudio }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ 
        top: scrollRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  }, [messages, isTyping]);

  return (
    <div 
      ref={scrollRef} 
      className="flex-1 overflow-y-auto px-6 md:px-20 py-12 custom-scrollbar"
      style={{ 
        height: '100%',
        maxHeight: '100%'
      }}
    >
      <div className="max-w-5xl mx-auto">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-[60vh] flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="relative animate-float">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150"></div>
                <div className="w-32 h-32 bg-gradient-to-tr from-emerald-500 to-emerald-700 rounded-[3rem] shadow-2xl flex items-center justify-center text-white relative z-10">
                    <i className="fas fa-mountain-sun text-5xl"></i>
                </div>
              </div>
              <div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-4">
                  Amahoro.
                </h1>
                <p className="text-xl text-slate-400 font-medium max-w-lg mx-auto">
                  I am Muraho, your gateway to the beauty and utility of Bujumbura. 
                  How may I elevate your day today?
                </p>
              </div>
            </motion.div>
          )}

          {messages.map((msg) => (
            <ArtifactCard key={msg.id} msg={msg} onPlayAudio={onPlayAudio} />
          ))}

          {isTyping && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-4 text-emerald-500 font-black uppercase tracking-[0.3em] text-[10px] mt-4"
            >
                <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                Synthesizing Perspective
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DiscoveryCanvas;