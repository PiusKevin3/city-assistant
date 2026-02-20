
import React, { useRef, useEffect } from 'react';
import { ChatMessage, InteractionContent } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onPlayAudio?: (text: string) => void;
}

const WeatherCard: React.FC<{ data: any }> = ({ data }) => {
  if (!data || !data.temp_c) return null;
  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-3xl shadow-xl mt-4 max-w-sm overflow-hidden relative group transition-all hover:scale-[1.02]">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-xl font-bold">{data.location?.name || 'Bujumbura'}</h3>
                <p className="text-blue-100 text-sm">{data.current?.condition?.text || 'Partly Cloudy'}</p>
            </div>
            <div className="text-4xl font-black">
                {Math.round(data.current?.temp_c || 28)}°
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs font-medium text-blue-50">
            <div className="flex items-center gap-2">
                <i className="fas fa-droplet opacity-70"></i>
                <span>{data.current?.humidity}% Humidity</span>
            </div>
            <div className="flex items-center gap-2">
                <i className="fas fa-wind opacity-70"></i>
                <span>{data.current?.wind_kph} km/h Wind</span>
            </div>
        </div>
    </div>
  );
};

const ContentRenderer: React.FC<{ content: InteractionContent, onPlayAudio?: (text: string) => void }> = ({ content, onPlayAudio }) => {
  // Simple check if text looks like the weather JSON mentioned in the prompt
  if (content.type === 'text' && content.text?.includes('"temp_c"')) {
      try {
          // Attempt to extract JSON if it was accidentally leaked (as a safety measure)
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              return <WeatherCard data={data} />;
          }
      } catch(e) {}
  }

  switch (content.type) {
    case 'text':
      return (
        <div className="group relative">
            <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{content.text}</p>
            {onPlayAudio && content.text && content.text.length > 10 && (
                <button 
                    onClick={() => onPlayAudio(content.text!)}
                    className="absolute -right-8 top-0 p-2 text-emerald-400 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Read aloud"
                >
                    <i className="fas fa-volume-up"></i>
                </button>
            )}
        </div>
      );
    case 'image':
      return (
        <div className="mt-3 relative group">
            <img src={content.uri || `data:${content.mime_type};base64,${content.data}`} alt="Shared content" className="rounded-2xl max-w-full h-auto border-4 border-white shadow-lg transition-transform group-hover:scale-[1.01]" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-gray-800">Visual Analysis Active</span>
            </div>
        </div>
      );
    case 'function_call':
      return (
        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl mt-3 flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <i className="fas fa-microchip text-emerald-600"></i>
            </div>
            <div>
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-tighter">Executing Action</div>
                <div className="text-sm text-emerald-900 font-medium">{content.name?.replace(/_/g, ' ')}</div>
            </div>
        </div>
      );
    default:
      return null;
  }
};

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isTyping, onPlayAudio }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl flex items-center justify-center shadow-2xl relative z-10">
                    <i className="fas fa-comment-dots text-white text-4xl"></i>
                </div>
            </div>
            <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Amahoro! Muraho!</h1>
            <p className="text-gray-500 text-lg leading-relaxed">
                Welcome to your premium digital concierge for the heart of Burundi. 
                I'm ready to assist with events, local commerce, and insights across Bujumbura.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 w-full">
                <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-left hover:shadow-md transition-shadow cursor-pointer">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-3 text-blue-500"><i className="fas fa-map-marker-alt"></i></div>
                    <div className="font-bold text-gray-800 text-sm">Discover Local Gems</div>
                    <div className="text-xs text-gray-400">"What's the best Akabenz spot?"</div>
                </div>
                <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-left hover:shadow-md transition-shadow cursor-pointer">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mb-3 text-purple-500"><i className="fas fa-calendar"></i></div>
                    <div className="font-bold text-gray-800 text-sm">Tech Meetups</div>
                    <div className="text-xs text-gray-400">"Any AI workshops in Buja?"</div>
                </div>
            </div>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[90%] sm:max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
            <div className={`rounded-3xl px-6 py-4 shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-gray-900 text-white border-gray-800' 
                : 'bg-white text-gray-800 border-gray-100'
            }`}>
              <div className="flex flex-col gap-2">
                {msg.content.map((item, idx) => (
                  <ContentRenderer key={idx} content={item} onPlayAudio={onPlayAudio} />
                ))}
              </div>
            </div>
            <div className={`text-[10px] mt-2 font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? 'You' : 'MurahoAI Concierge'} &bull; {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      ))}

      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-white border border-gray-50 rounded-full px-6 py-3 shadow-sm flex items-center gap-3">
            <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Processing</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
