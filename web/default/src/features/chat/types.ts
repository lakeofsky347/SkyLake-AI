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

export type ChatRole = 'system' | 'user' | 'assistant'

export type ChatConversation = {
  id: number
  user_id: number
  title: string
  model_name: string
  group: string
  created_at: number
  updated_at: number
}

export type ChatMessage = {
  id: number
  conversation_id: number
  user_id: number
  role: ChatRole
  content: string
  model_name: string
  prompt_tokens: number
  completion_tokens: number
  quota: number
  created_at: number
}

export type ApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

export type ChatConversationList = {
  items: ChatConversation[]
  total: number
}

export type ChatConversationPayload = {
  title?: string
  model?: string
  group?: string
}

export type ChatMessagePayload = {
  role: 'user'
  content: string
  model?: string
}

export type ChatSendPayload = {
  content: string
  model: string
  group?: string
}

export type ChatMessageUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export type ChatSendResponse = {
  conversation: ChatConversation
  user_message: ChatMessage
  assistant_message: ChatMessage
  usage: ChatMessageUsage
}
