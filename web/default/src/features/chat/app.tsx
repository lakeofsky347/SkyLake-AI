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
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Markdown } from '@/components/ui/markdown'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  getUserGroups,
  getUserModels,
  sendChatCompletion,
} from '@/features/playground/api'
import type { ChatCompletionMessage } from '@/features/playground/types'
import {
  appendChatMessages,
  createChatConversation,
  deleteChatConversation,
  getChatConversations,
  getChatMessages,
  updateChatConversation,
} from './api'
import type { ChatConversation, ChatMessage, ChatRole } from './types'

const CHAT_CONVERSATIONS_QUERY_KEY = ['chat', 'conversations'] as const

function buildChatTitle(content: string) {
  const title = content.replace(/\s+/g, ' ').trim()
  return title.length > 48 ? `${title.slice(0, 48)}...` : title || 'New chat'
}

function toCompletionMessages(messages: ChatMessage[]): ChatCompletionMessage[] {
  return messages
    .filter((message) => message.role !== 'system' || message.content.trim())
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))
}

function createPendingMessage(
  role: ChatRole,
  content: string,
  model: string
): ChatMessage {
  return {
    id: -Date.now() - (role === 'assistant' ? 1 : 0),
    conversation_id: 0,
    user_id: 0,
    role,
    content,
    model_name: model,
    prompt_tokens: 0,
    completion_tokens: 0,
    quota: 0,
    created_at: Math.floor(Date.now() / 1000),
  }
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const Icon = isUser ? User : Bot

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg'>
          <Icon className='size-4' />
        </div>
      )}
      <div
        className={cn(
          'max-w-[min(760px,85%)] rounded-lg px-3 py-2 text-sm leading-6',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {message.role === 'assistant' ? (
          <Markdown className='prose-p:my-0'>{message.content}</Markdown>
        ) : (
          <div className='whitespace-pre-wrap break-words'>
            {message.content}
          </div>
        )}
      </div>
      {isUser && (
        <div className='bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg'>
          <Icon className='size-4' />
        </div>
      )}
    </div>
  )
}

export function ChatApp() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)

  const conversationsQuery = useQuery({
    queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    queryFn: getChatConversations,
  })

  const modelsQuery = useQuery({
    queryKey: ['chat', 'models'],
    queryFn: getUserModels,
    staleTime: 5 * 60 * 1000,
  })

  const groupsQuery = useQuery({
    queryKey: ['chat', 'groups'],
    queryFn: getUserGroups,
    staleTime: 5 * 60 * 1000,
  })

  const conversations = conversationsQuery.data?.data?.items ?? []
  const models = modelsQuery.data ?? []
  const groups = groupsQuery.data ?? []

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId
      ),
    [activeConversationId, conversations]
  )

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', activeConversationId],
    queryFn: () => getChatMessages(activeConversationId ?? 0),
    enabled: activeConversationId !== null,
  })

  const storedMessages = messagesQuery.data?.data ?? []
  const visibleMessages = useMemo(
    () => [...storedMessages, ...pendingMessages],
    [pendingMessages, storedMessages]
  )

  useEffect(() => {
    if (activeConversationId === null && conversations.length > 0) {
      setActiveConversationId(conversations[0].id)
    }
  }, [activeConversationId, conversations])

  useEffect(() => {
    if (!activeConversation) return
    setDraftTitle(activeConversation.title)
    if (activeConversation.model_name) {
      setSelectedModel(activeConversation.model_name)
    }
    if (activeConversation.group) {
      setSelectedGroup(activeConversation.group)
    }
  }, [activeConversation])

  useEffect(() => {
    if (!selectedModel && models.length > 0) {
      setSelectedModel(models[0].value)
    }
  }, [models, selectedModel])

  useEffect(() => {
    if (!selectedGroup && groups.length > 0) {
      setSelectedGroup(groups[0].value)
    }
  }, [groups, selectedGroup])

  async function refreshChatData(conversationId: number) {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
      }),
      queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', conversationId],
      }),
    ])
  }

  async function ensureConversation(content: string) {
    if (activeConversation) return activeConversation
    const response = await createChatConversation({
      title: buildChatTitle(content),
      model: selectedModel,
      group: selectedGroup,
    })
    if (!response.success || !response.data) {
      throw new Error(response.message || t('Failed to create chat'))
    }
    setActiveConversationId(response.data.id)
    await queryClient.invalidateQueries({
      queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    })
    return response.data
  }

  async function handleSaveTitle() {
    if (!activeConversation || !draftTitle.trim()) return
    const title = draftTitle.trim()
    if (title === activeConversation.title) return
    const response = await updateChatConversation(activeConversation.id, {
      title,
    })
    if (!response.success) {
      toast.error(response.message || t('Failed to update chat title'))
      return
    }
    await queryClient.invalidateQueries({
      queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    })
  }

  async function handleCreateConversation() {
    const response = await createChatConversation({
      title: t('New chat'),
      model: selectedModel,
      group: selectedGroup,
    })
    if (!response.success || !response.data) {
      toast.error(response.message || t('Failed to create chat'))
      return
    }
    setActiveConversationId(response.data.id)
    setInput('')
    setPendingMessages([])
    await queryClient.invalidateQueries({
      queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    })
  }

  async function handleDeleteConversation(conversation: ChatConversation) {
    const response = await deleteChatConversation(conversation.id)
    if (!response.success) {
      toast.error(response.message || t('Failed to delete chat'))
      return
    }
    if (activeConversationId === conversation.id) {
      setActiveConversationId(null)
      setPendingMessages([])
    }
    await queryClient.invalidateQueries({
      queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    })
  }

  async function handleSend() {
    const content = input.trim()
    if (!content || isSending) return
    if (!selectedModel) {
      toast.error(t('Select a model before sending.'))
      return
    }

    setIsSending(true)
    setInput('')
    const userMessage = createPendingMessage('user', content, selectedModel)
    const assistantPlaceholder = createPendingMessage(
      'assistant',
      t('Thinking...'),
      selectedModel
    )
    setPendingMessages([userMessage, assistantPlaceholder])

    try {
      const conversation = await ensureConversation(content)
      await appendChatMessages(conversation.id, [
        {
          role: 'user',
          content,
          model: selectedModel,
        },
      ])

      const completionMessages = toCompletionMessages([
        ...storedMessages,
        userMessage,
      ])
      const completion = await sendChatCompletion({
        model: selectedModel,
        group: selectedGroup || undefined,
        messages: completionMessages,
        stream: false,
      })
      const assistantContent =
        completion.choices?.[0]?.message?.content?.trim() ?? ''
      if (!assistantContent) {
        throw new Error(t('The model returned an empty response.'))
      }

      await appendChatMessages(conversation.id, [
        {
          role: 'assistant',
          content: assistantContent,
          model: completion.model || selectedModel,
          prompt_tokens: completion.usage?.prompt_tokens ?? 0,
          completion_tokens: completion.usage?.completion_tokens ?? 0,
        },
      ])
      setPendingMessages([])
      await refreshChatData(conversation.id)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('Failed to send message')
      toast.error(message)
      setPendingMessages([])
      if (activeConversationId !== null) {
        await refreshChatData(activeConversationId)
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className='bg-background flex h-full min-h-[calc(100vh-4rem)] flex-col overflow-hidden md:flex-row'>
      <aside className='border-border bg-muted/20 flex h-56 shrink-0 flex-col border-b md:h-auto md:w-72 md:border-r md:border-b-0'>
        <div className='border-border flex items-center justify-between gap-2 border-b p-3'>
          <div className='min-w-0'>
            <h1 className='truncate text-sm font-semibold'>
              {t('Chat Workspace')}
            </h1>
            <p className='text-muted-foreground truncate text-xs'>
              {t('Saved conversations')}
            </p>
          </div>
          <Button
            size='icon'
            variant='outline'
            onClick={handleCreateConversation}
            aria-label={t('New chat')}
          >
            <Plus className='size-4' />
          </Button>
        </div>
        <div className='flex-1 overflow-y-auto p-2'>
          {conversations.length === 0 ? (
            <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm'>
              <MessageSquare className='size-8' />
              <p>{t('No saved chats yet')}</p>
            </div>
          ) : (
            <div className='space-y-1'>
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-lg',
                    conversation.id === activeConversationId
                      ? 'bg-background shadow-sm'
                      : 'hover:bg-background/70'
                  )}
                >
                  <button
                    type='button'
                    className='min-w-0 flex-1 px-2 py-2 text-left'
                    onClick={() => {
                      setActiveConversationId(conversation.id)
                      setPendingMessages([])
                    }}
                  >
                    <p className='truncate text-sm font-medium'>
                      {conversation.title}
                    </p>
                    <p className='text-muted-foreground truncate text-xs'>
                      {conversation.model_name || t('No model selected')}
                    </p>
                  </button>
                  <Button
                    size='icon-sm'
                    variant='ghost'
                    onClick={() => handleDeleteConversation(conversation)}
                    aria-label={t('Delete chat')}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className='flex min-h-0 flex-1 flex-col'>
        <div className='border-border flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center'>
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={handleSaveTitle}
            placeholder={t('New chat')}
            disabled={!activeConversation}
            className='min-w-0 flex-1'
          />
          <div className='grid gap-2 sm:grid-cols-2 lg:w-[520px]'>
            <NativeSelect
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              aria-label={t('Model')}
              className='w-full'
            >
              {models.length === 0 ? (
                <NativeSelectOption value=''>
                  {t('No model available')}
                </NativeSelectOption>
              ) : (
                models.map((model) => (
                  <NativeSelectOption key={model.value} value={model.value}>
                    {model.label}
                  </NativeSelectOption>
                ))
              )}
            </NativeSelect>
            <NativeSelect
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
              aria-label={t('Group')}
              className='w-full'
            >
              {groups.length === 0 ? (
                <NativeSelectOption value=''>
                  {t('Default group')}
                </NativeSelectOption>
              ) : (
                groups.map((group) => (
                  <NativeSelectOption key={group.value} value={group.value}>
                    {group.label}
                  </NativeSelectOption>
                ))
              )}
            </NativeSelect>
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto p-4'>
          {messagesQuery.isLoading || conversationsQuery.isLoading ? (
            <div className='text-muted-foreground flex h-full items-center justify-center gap-2 text-sm'>
              <Loader2 className='size-4 animate-spin' />
              {t('Loading...')}
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center'>
              <MessageSquare className='size-10' />
              <div className='space-y-1'>
                <h2 className='text-foreground text-base font-semibold'>
                  {t('Start a new conversation')}
                </h2>
                <p className='max-w-md text-sm'>
                  {t(
                    'Ask a question, compare models, or draft content. Messages are saved to your account.'
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className='mx-auto flex max-w-5xl flex-col gap-4'>
              {visibleMessages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}
            </div>
          )}
        </div>

        <div className='border-border bg-background border-t p-3'>
          <div className='mx-auto flex max-w-5xl flex-col gap-2'>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
              placeholder={t('Message the model...')}
              className='max-h-40 min-h-20 resize-none'
              disabled={isSending}
            />
            <div className='flex items-center justify-between gap-2'>
              <p className='text-muted-foreground text-xs'>
                {t('Enter to send, Shift+Enter for a new line')}
              </p>
              <Button
                onClick={handleSend}
                disabled={isSending || !input.trim() || !selectedModel}
              >
                {isSending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <Send className='size-4' />
                )}
                {t('Send')}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
