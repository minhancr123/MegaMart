import axiosClient from './axiosClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  success: boolean;
  message: string;
  error?: string;
}

export const aiApi = {
  chat: (data: ChatRequest) => 
    axiosClient.post<ChatResponse>('/ai/chat', data),
  
  searchProducts: (query: string, limit?: number) =>
    axiosClient.post('/ai/search-products', { query, limit }),
};
