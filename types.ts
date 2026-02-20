
export type ContentType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'function_call' | 'function_result' | 'thought';

export interface InteractionContent {
  type: ContentType;
  text?: string;
  data?: string; // base64
  uri?: string;
  mime_type?: string;
  name?: string;
  arguments?: Record<string, any>;
  id?: string;
  result?: any;
  call_id?: string;
  summary?: string;
  signature?: string;
}

export interface Interaction {
  id: string;
  status: 'completed' | 'in_progress' | 'requires_action' | 'failed' | 'cancelled';
  outputs: InteractionContent[];
  usage?: {
    total_tokens: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: InteractionContent[];
  timestamp: Date;
  interactionId?: string;
}

export interface EventDetails {
  name: string;
  date: string;
  location: string;
  price: string;
  description: string;
}
