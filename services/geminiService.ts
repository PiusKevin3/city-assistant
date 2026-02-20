
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { InteractionContent, Interaction } from "../types";

export class MurahoAIService {
  private client: GoogleGenAI;
  private audioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return this.audioContext;
  }

  async createInteraction(params: {
    input: string | any[];
    model?: string;
    tools?: any[];
    language?: string;
  }): Promise<Interaction> {
    const parts: any[] = [];
    
    if (Array.isArray(params.input)) {
        params.input.forEach(item => {
            if (typeof item === 'string') parts.push({ text: item });
            else if (item.text) parts.push({ text: item.text });
            else if (item.data && item.mime_type) {
                parts.push({ inlineData: { data: item.data, mimeType: item.mime_type } });
            }
        });
    } else {
        parts.push({ text: params.input });
    }

    const systemInstruction = `You are MurahoAI, a world-class digital concierge for Bujumbura, Burundi. 
    You are natively multilingual in English, French, and Kirundi.
    
    CRITICAL INSTRUCTIONS:
    1. Respond in the SAME language the user used. If the user speaks Kirundi, reply in Kirundi.
    2. Transform requests into useful, elegant information.
    3. NO raw JSON or markdown artifacts. 
    4. You know Bujumbura deeply (Rohero, Gihosha, Kiriri, etc.).
    5. Always conclude with a helpful cultural tip or a "Next Step".`;

    const response = await this.client.models.generateContent({
        model: params.model || 'gemini-3-flash-preview',
        contents: { parts },
        config: {
            systemInstruction,
            tools: params.tools,
        }
    });

    const outputs: InteractionContent[] = [];
    let cleanText = (response.text || "").replace(/[*#]/g, '').trim();
    
    if (cleanText) {
        outputs.push({ type: 'text', text: cleanText });
    }

    const fcs = response.functionCalls;
    if (fcs) {
        fcs.forEach(fc => {
            outputs.push({
                type: 'function_call',
                name: fc.name,
                arguments: fc.args,
                id: fc.id
            });
        });
    }

    return {
      id: `int_${Math.random()}`,
      status: 'completed',
      outputs,
      usage: { total_tokens: response.usageMetadata?.totalTokenCount || 0 }
    };
  }

  async connectLive(callbacks: {
    onTranscription: (text: string, isModel: boolean) => void;
    onClose: () => void;
  }) {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputCtx = this.getAudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const sessionPromise = this.client.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = this.inputAudioContext!.createMediaStreamSource(stream);
          const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = this.createBlob(inputData);
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(this.inputAudioContext!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) {
            callbacks.onTranscription(message.serverContent.outputTranscription.text, true);
          }
          if (message.serverContent?.inputTranscription) {
            callbacks.onTranscription(message.serverContent.inputTranscription.text, false);
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            this.nextStartTime = Math.max(this.nextStartTime, outputCtx.currentTime);
            const audioBuffer = await this.decodeAudioData(this.decodeBase64(base64Audio), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
            source.onended = () => this.sources.delete(source);
          }

          if (message.serverContent?.interrupted) {
            this.sources.forEach(s => s.stop());
            this.sources.clear();
            this.nextStartTime = 0;
          }
        },
        onclose: callbacks.onClose,
        onerror: (e) => console.error("Live Error", e)
      },
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: "You are MurahoAI. Speak in English, French, or Kirundi. Be helpful, warm and concise. Use Google Search to find latest Buja news if asked.",
        tools: [{ googleSearch: {} }],
        outputAudioTranscription: {},
        inputAudioTranscription: {}
      }
    });

    return sessionPromise;
  }

  private createBlob(data: Float32Array): { data: string; mimeType: string } {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return {
      data: this.encodeBase64(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private encodeBase64(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private decodeBase64(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }

  async speak(text: string): Promise<void> {
    const ctx = this.getAudioContext();
    const response = await this.client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: text.substring(0, 300) }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) await this.playRawPcm(base64Audio);
  }

  private async playRawPcm(base64: string) {
    const ctx = this.getAudioContext();
    const data = this.decodeBase64(base64);
    const audioBuffer = await this.decodeAudioData(data, ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  }
}

export const murahoAI = new MurahoAIService();
