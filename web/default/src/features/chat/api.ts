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
import { api, getCommonHeaders } from '@/lib/api'
import type {
  ApiResponse,
  ChatAttachment,
  ChatConversation,
  ChatConversationList,
  ChatConversationPayload,
  ChatMessage,
  ChatMessagePayload,
  ChatSendPayload,
  ChatSendResponse,
} from './types'

type ChatStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string
      reasoning_content?: string
      reasoning?: string
    }
  }>
  error?: string | { message?: string }
}

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
  const res = await api.get(
    `/api/chat/conversations/${conversationId}/messages`
  )
  return res.data
}

export async function appendChatMessages(
  conversationId: number,
  messages: ChatMessagePayload[]
): Promise<ApiResponse<ChatMessage[]>> {
  const res = await api.post(
    `/api/chat/conversations/${conversationId}/messages`,
    {
      messages,
    }
  )
  return res.data
}

export async function uploadChatAttachment(
  conversationId: number,
  file: File
): Promise<ApiResponse<ChatAttachment>> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post(
    `/api/chat/conversations/${conversationId}/attachments`,
    formData
  )
  return res.data
}

export async function getPendingChatAttachments(
  conversationId: number
): Promise<ApiResponse<ChatAttachment[]>> {
  const res = await api.get(
    `/api/chat/conversations/${conversationId}/attachments`
  )
  return res.data
}

export async function deleteChatAttachment(
  conversationId: number,
  attachmentId: number
): Promise<ApiResponse<null>> {
  const res = await api.delete(
    `/api/chat/conversations/${conversationId}/attachments/${attachmentId}`
  )
  return res.data
}

export async function sendChatMessage(
  conversationId: number,
  payload: ChatSendPayload
): Promise<ApiResponse<ChatSendResponse>> {
  const res = await api.post(
    `/api/chat/conversations/${conversationId}/send`,
    payload
  )
  return res.data
}

function getStreamErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      message?: string
      error?: ChatStreamChunk['error']
    }
    if (parsed.message) return parsed.message
    if (typeof parsed.error === 'string') return parsed.error
    if (parsed.error?.message) return parsed.error.message
  } catch {
    /* empty */
  }
  return raw.trim() || 'Failed to send message'
}

function readStreamDelta(raw: string): string {
  const data = raw.trim()
  if (!data || data === '[DONE]') return ''

  const parsed = JSON.parse(data) as ChatStreamChunk
  if (typeof parsed.error === 'string') {
    throw new Error(parsed.error)
  }
  if (parsed.error?.message) {
    throw new Error(parsed.error.message)
  }

  let delta = ''
  for (const choice of parsed.choices ?? []) {
    if (typeof choice.delta?.content === 'string') {
      delta += choice.delta.content
    }
  }
  return delta
}

function readStreamEventData(event: string): string[] {
  return event
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean)
}

export async function streamChatMessage(
  conversationId: number,
  payload: ChatSendPayload,
  onDelta: (delta: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch(
    `/api/chat/conversations/${conversationId}/stream`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getCommonHeaders(),
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
      signal,
    }
  )

  if (!response.ok) {
    throw new Error(getStreamErrorMessage(await response.text()))
  }
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('text/event-stream')) {
    throw new Error(getStreamErrorMessage(await response.text()))
  }
  if (!response.body) {
    throw new Error('Failed to send message')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let streamError: Error | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() ?? ''

    for (const event of events) {
      for (const data of readStreamEventData(event)) {
        try {
          const delta = readStreamDelta(data)
          if (!delta) continue
          fullContent += delta
          onDelta(delta)
        } catch (error) {
          streamError =
            error instanceof Error
              ? error
              : new Error(getStreamErrorMessage(data))
        }
      }
    }
  }

  const tail = decoder.decode()
  if (tail) buffer += tail
  for (const data of readStreamEventData(buffer)) {
    try {
      const delta = readStreamDelta(data)
      if (!delta) continue
      fullContent += delta
      onDelta(delta)
    } catch (error) {
      streamError =
        error instanceof Error ? error : new Error(getStreamErrorMessage(data))
    }
  }

  if (streamError) throw streamError
  return fullContent
}
