/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { api } from '@/lib/api'
import type {
  ApiResponse,
  ChatConversation,
  ChatConversationList,
  ChatConversationPayload,
  ChatMessage,
  ChatMessagePayload,
} from './types'

export async function getChatConversations(): Promise<
  ApiResponse<ChatConversationList>
> {
  const res = await api.get('/api/chat/conversations')
  return res.data
}

export async function createChatConversation(
  payload: ChatConversationPayload
): Promise<ApiResponse<ChatConversation>> {
  const res = await api.post('/api/chat/conversations', payload)
  return res.data
}

export async function updateChatConversation(
  id: number,
  payload: ChatConversationPayload
): Promise<ApiResponse<ChatConversation>> {
  const res = await api.patch(`/api/chat/conversations/${id}`, payload)
  return res.data
}

export async function deleteChatConversation(
  id: number
): Promise<ApiResponse<null>> {
  const res = await api.delete(`/api/chat/conversations/${id}`)
  return res.data
}

export async function getChatMessages(
  conversationId: number
): Promise<ApiResponse<ChatMessage[]>> {
  const res = await api.get(`/api/chat/conversations/${conversationId}/messages`)
  return res.data
}

export async function appendChatMessages(
  conversationId: number,
  messages: ChatMessagePayload[]
): Promise<ApiResponse<ChatMessage[]>> {
  const res = await api.post(`/api/chat/conversations/${conversationId}/messages`, {
    messages,
  })
  return res.data
}
