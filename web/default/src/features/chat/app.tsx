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
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Bot,
  Crown,
  ImageIcon,
  Loader2,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Square,
  Trash2,
  User,
  WalletCards,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatLogQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useStatus } from '@/hooks/use-status'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Markdown } from '@/components/ui/markdown'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { getUserId } from '@/features/auth/lib/storage'
import type { SystemStatus } from '@/features/auth/types'
import { getUserGroups, getUserModels } from '@/features/playground/api'
import { getSelfSubscriptionFull } from '@/features/subscriptions/api'
import {
  createChatConversation,
  deleteChatAttachment,
  deleteChatConversation,
  getChatConversations,
  getChatMessages,
  getPendingChatAttachments,
  streamChatRegeneration,
  streamChatMessage,
  uploadChatAttachment,
  updateChatConversation,
} from './api'
import type {
  ChatAttachment,
  ChatConversation,
  ChatMessage,
  ChatMessageContentPart,
  ChatMessageStatus,
  ChatRole,
} from './types'

const CHAT_CONVERSATIONS_QUERY_KEY = ['chat', 'conversations'] as const
const CHAT_DEFAULT_ALLOWED_IMAGE_MIME_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]
const CHAT_DEFAULT_MAX_IMAGE_ATTACHMENTS = 8
const CHAT_DEFAULT_MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024
const CHAT_DRAFT_STORAGE_KEY = 'chat.drafts.v1'

type ChatImageAttachment = {
  id: string
  url: string
  fileName?: string
  source: 'uploaded' | 'external'
}

type ChatAttachmentClientConfig = {
  allowedImageMimeTypes: string[]
  maxImageAttachments: number
  maxImageFileSizeBytes: number
}

type ChatStoredDraft = {
  input: string
  imageUrlInput: string
  isImageUrlOpen: boolean
  externalImageAttachments: Array<{
    id: string
    url: string
  }>
}

type ChatResponseFailure = {
  conversationId: number
  message: string
}

type ChatMessageStateMeta = {
  label: string
  detail: string
  tone: 'default' | 'warning' | 'destructive'
}

function getStatusValue<T>(status: SystemStatus | null, key: string) {
  const directValue = status?.[key]
  if (directValue !== undefined) {
    return directValue as T
  }
  const nestedValue = status?.data?.[key]
  if (nestedValue !== undefined) {
    return nestedValue as T
  }
  return undefined
}

function getChatAttachmentClientConfig(
  status: SystemStatus | null
): ChatAttachmentClientConfig {
  const rawAllowedImageMimeTypes = getStatusValue<unknown>(
    status,
    'chat_attachment_allowed_image_mime_types'
  )
  const allowedImageMimeTypes = Array.isArray(rawAllowedImageMimeTypes)
    ? rawAllowedImageMimeTypes
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : CHAT_DEFAULT_ALLOWED_IMAGE_MIME_TYPES

  const rawMaxImageAttachments = Number(
    getStatusValue(status, 'chat_attachment_max_image_count')
  )
  const rawMaxImageFileSizeBytes = Number(
    getStatusValue(status, 'chat_attachment_max_image_file_size_bytes')
  )

  return {
    allowedImageMimeTypes:
      allowedImageMimeTypes.length > 0
        ? allowedImageMimeTypes
        : CHAT_DEFAULT_ALLOWED_IMAGE_MIME_TYPES,
    maxImageAttachments:
      Number.isFinite(rawMaxImageAttachments) && rawMaxImageAttachments > 0
        ? Math.floor(rawMaxImageAttachments)
        : CHAT_DEFAULT_MAX_IMAGE_ATTACHMENTS,
    maxImageFileSizeBytes:
      Number.isFinite(rawMaxImageFileSizeBytes) && rawMaxImageFileSizeBytes > 0
        ? Math.floor(rawMaxImageFileSizeBytes)
        : CHAT_DEFAULT_MAX_IMAGE_FILE_SIZE_BYTES,
  }
}

function buildChatTitle(content: string) {
  const title = content.replace(/\s+/g, ' ').trim()
  return title.length > 48 ? `${title.slice(0, 48)}...` : title || 'New chat'
}

function formatTokenCount(value: number) {
  const count = Math.max(0, Math.floor(Number(value) || 0))
  return count.toLocaleString()
}

function getChatMessageTokenUsage(message: ChatMessage) {
  const promptTokens = Math.max(0, Number(message.prompt_tokens) || 0)
  const completionTokens = Math.max(0, Number(message.completion_tokens) || 0)
  const totalTokens = promptTokens + completionTokens
  const quota = Math.max(0, Number(message.quota) || 0)
  if (totalTokens <= 0 && quota <= 0) return null
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    quota,
  }
}

function getChatMessageBillingSourceLabel(
  message: ChatMessage,
  t: (key: string) => string
) {
  const source = String(message.billing_source || '').trim()
  if (!source) return ''
  if (source === 'wallet') return t('Wallet')
  if (source === 'subscription') {
    const planTitle = String(message.subscription_plan_title || '').trim()
    return planTitle ? `${t('Subscription')}: ${planTitle}` : t('Subscription')
  }
  return source
}

function normalizeChatMessageStatus(message: ChatMessage): ChatMessageStatus {
  const status = String(message.status || '')
    .trim()
    .toLowerCase()
  switch (status) {
    case 'error':
    case 'stopped':
    case 'empty':
    case 'streaming':
    case 'completed':
      return status
    default:
      return 'completed'
  }
}

function isRetryableChatMessageStatus(status?: string) {
  return ['error', 'stopped', 'empty'].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  )
}

function getChatMessageStateMeta(
  message: ChatMessage,
  t: (key: string) => string
): ChatMessageStateMeta | null {
  if (message.role !== 'assistant') return null

  switch (normalizeChatMessageStatus(message)) {
    case 'streaming':
      return {
        label: t('Generating...'),
        detail: '',
        tone: 'default',
      }
    case 'error':
      return {
        label: t('Response failed'),
        detail: message.error_message || t('Request failed'),
        tone: 'destructive',
      }
    case 'stopped':
      return {
        label: t('Response stopped'),
        detail:
          message.error_message ||
          t('Generation was stopped before completion.'),
        tone: 'warning',
      }
    case 'empty':
      return {
        label: t('Empty response'),
        detail:
          message.error_message || t('The model returned an empty response.'),
        tone: 'warning',
      }
    default:
      return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getChatDraftKey(conversationId: number) {
  return `${getUserId() ?? 'anonymous'}:${conversationId}`
}

function readChatDraftMap(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CHAT_DRAFT_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeStoredChatDraft(value: unknown): ChatStoredDraft {
  if (!isRecord(value)) {
    return {
      input: '',
      imageUrlInput: '',
      isImageUrlOpen: false,
      externalImageAttachments: [],
    }
  }

  const externalImageAttachments = Array.isArray(value.externalImageAttachments)
    ? value.externalImageAttachments
        .filter(isRecord)
        .map((attachment) => ({
          id:
            typeof attachment.id === 'string'
              ? attachment.id
              : `external-${Date.now()}`,
          url: typeof attachment.url === 'string' ? attachment.url.trim() : '',
        }))
        .filter((attachment) => attachment.url)
    : []

  return {
    input: typeof value.input === 'string' ? value.input : '',
    imageUrlInput:
      typeof value.imageUrlInput === 'string' ? value.imageUrlInput : '',
    isImageUrlOpen: value.isImageUrlOpen === true,
    externalImageAttachments,
  }
}

function getStoredChatDraft(conversationId: number): ChatStoredDraft {
  return normalizeStoredChatDraft(
    readChatDraftMap()[getChatDraftKey(conversationId)]
  )
}

function isStoredChatDraftEmpty(draft: ChatStoredDraft) {
  return (
    draft.input.trim() === '' &&
    draft.imageUrlInput.trim() === '' &&
    draft.externalImageAttachments.length === 0
  )
}

function setStoredChatDraft(conversationId: number, draft: ChatStoredDraft) {
  if (typeof window === 'undefined') return
  try {
    const draftMap = readChatDraftMap()
    const key = getChatDraftKey(conversationId)
    if (isStoredChatDraftEmpty(draft)) {
      delete draftMap[key]
    } else {
      draftMap[key] = draft
    }
    window.localStorage.setItem(
      CHAT_DRAFT_STORAGE_KEY,
      JSON.stringify(draftMap)
    )
  } catch {
    /* local draft persistence is best-effort */
  }
}

function clearStoredChatDraft(conversationId: number) {
  if (typeof window === 'undefined') return
  try {
    const draftMap = readChatDraftMap()
    delete draftMap[getChatDraftKey(conversationId)]
    window.localStorage.setItem(
      CHAT_DRAFT_STORAGE_KEY,
      JSON.stringify(draftMap)
    )
  } catch {
    /* local draft persistence is best-effort */
  }
}

function mapChatAttachmentToImageAttachment(
  attachment: ChatAttachment
): ChatImageAttachment {
  return {
    id: String(attachment.id),
    url: attachment.public_url,
    fileName: attachment.file_name,
    source: 'uploaded',
  }
}

function createPendingMessage(
  role: ChatRole,
  content: string,
  model: string,
  contentParts?: ChatMessageContentPart[],
  status?: ChatMessageStatus
): ChatMessage {
  return {
    id: -Date.now() - (role === 'assistant' ? 1 : 0),
    conversation_id: 0,
    user_id: 0,
    role,
    content,
    content_parts: contentParts ? JSON.stringify(contentParts) : undefined,
    model_name: model,
    prompt_tokens: 0,
    completion_tokens: 0,
    quota: 0,
    status: status || (role === 'assistant' ? 'streaming' : 'completed'),
    created_at: Math.floor(Date.now() / 1000),
  }
}

function isValidImageUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function buildChatContentParts(
  content: string,
  attachments: ChatImageAttachment[]
): ChatMessageContentPart[] | undefined {
  if (attachments.length === 0) return undefined
  const parts: ChatMessageContentPart[] = []
  const text = content.trim()
  if (text) {
    parts.push({
      type: 'text',
      text,
    })
  }
  for (const attachment of attachments) {
    parts.push({
      type: 'image_url',
      image_url: {
        url: attachment.url,
        detail: 'high',
      },
    })
  }
  return parts
}

function parseChatContentParts(message: ChatMessage): ChatMessageContentPart[] {
  if (!message.content_parts) return []
  try {
    const parts = JSON.parse(message.content_parts) as ChatMessageContentPart[]
    return Array.isArray(parts) ? parts : []
  } catch {
    return []
  }
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation()
  const isUser = message.role === 'user'
  const Icon = isUser ? User : Bot
  const contentParts = parseChatContentParts(message)
  const imageParts: Extract<ChatMessageContentPart, { type: 'image_url' }>[] =
    []
  const textParts: string[] = []
  for (const part of contentParts) {
    if (part.type === 'text') {
      textParts.push(part.text)
    } else if (part.type === 'image_url') {
      imageParts.push(part)
    }
  }
  const textContent =
    contentParts.length > 0
      ? textParts.filter(Boolean).join('\n\n')
      : message.content
  const stateMeta = getChatMessageStateMeta(message, t)
  const normalizedStatus = normalizeChatMessageStatus(message)
  const displayTextContent =
    textContent || (!isUser && stateMeta ? stateMeta.detail : '')
  const tokenUsage = getChatMessageTokenUsage(message)
  const billingSourceLabel = getChatMessageBillingSourceLabel(message, t)
  const showStateDetail =
    !!stateMeta?.detail && !!textContent && stateMeta.detail !== textContent
  const shouldShowNoCharge =
    !isUser &&
    !!stateMeta &&
    normalizedStatus !== 'streaming' &&
    !tokenUsage &&
    Math.max(0, Number(message.quota) || 0) <= 0

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
        {displayTextContent &&
          (message.role === 'assistant' ? (
            <Markdown className='prose-p:my-0'>{displayTextContent}</Markdown>
          ) : (
            <div className='break-words whitespace-pre-wrap'>
              {displayTextContent}
            </div>
          ))}
        {imageParts.length > 0 && (
          <div className={cn('grid gap-2', displayTextContent && 'mt-2')}>
            {imageParts.map((part, index) => (
              <a
                key={`${part.image_url.url}-${index}`}
                href={part.image_url.url}
                rel='noreferrer'
                target='_blank'
              >
                <img
                  alt={t('Image')}
                  className='max-h-64 w-full rounded-md object-cover'
                  src={part.image_url.url}
                />
              </a>
            ))}
          </div>
        )}
        {(stateMeta || tokenUsage) && (
          <div
            className={cn(
              'mt-2 flex flex-wrap gap-x-2 gap-y-1 border-t pt-2 text-[11px] leading-4',
              isUser
                ? 'border-primary-foreground/20 text-primary-foreground/70'
                : 'border-border text-muted-foreground'
            )}
          >
            {stateMeta && (
              <span
                className={cn(
                  'font-medium',
                  stateMeta.tone === 'destructive' &&
                    (isUser ? 'text-primary-foreground' : 'text-destructive'),
                  stateMeta.tone === 'warning' &&
                    (isUser
                      ? 'text-primary-foreground'
                      : 'text-amber-700 dark:text-amber-400')
                )}
              >
                {stateMeta.label}
              </span>
            )}
            {showStateDetail && <span>{stateMeta?.detail}</span>}
            {tokenUsage && tokenUsage.promptTokens > 0 && (
              <span>
                {t('Input tokens')}: {formatTokenCount(tokenUsage.promptTokens)}
              </span>
            )}
            {tokenUsage && tokenUsage.completionTokens > 0 && (
              <span>
                {t('Output tokens')}:{' '}
                {formatTokenCount(tokenUsage.completionTokens)}
              </span>
            )}
            {tokenUsage && (
              <span>
                {t('Total tokens')}: {formatTokenCount(tokenUsage.totalTokens)}
              </span>
            )}
            {tokenUsage && tokenUsage.quota > 0 && (
              <span>
                {t('Fee')}: {formatLogQuota(tokenUsage.quota)}
              </span>
            )}
            {billingSourceLabel && (
              <span>
                {t('Billing Source')}: {billingSourceLabel}
              </span>
            )}
            {shouldShowNoCharge && <span>{t('No charge recorded')}</span>}
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

function getChatErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message === 'Failed to send message' ? fallback : error.message
  }
  return fallback
}

export function ChatApp() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { status } = useStatus()
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([])
  const [imageAttachments, setImageAttachments] = useState<
    ChatImageAttachment[]
  >([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [isImageUrlOpen, setIsImageUrlOpen] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isRetryingResponse, setIsRetryingResponse] = useState(false)
  const [responseFailure, setResponseFailure] =
    useState<ChatResponseFailure | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const restoredDraftConversationIdRef = useRef<number | null>(null)

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

  const subscriptionStatusQuery = useQuery({
    queryKey: ['chat', 'subscription-status'],
    queryFn: getSelfSubscriptionFull,
    staleTime: 5 * 60 * 1000,
  })

  const conversations = conversationsQuery.data?.data?.items ?? []
  const models = modelsQuery.data ?? []
  const groups = groupsQuery.data ?? []
  const activeSubscriptionCount =
    subscriptionStatusQuery.data?.data?.subscriptions?.length ?? 0
  const hasActiveSubscription = activeSubscriptionCount > 0
  const attachmentConfig = useMemo(
    () => getChatAttachmentClientConfig(status),
    [status]
  )

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
  const lastStoredMessage = storedMessages.at(-1)
  const visibleMessages = useMemo(
    () => [...storedMessages, ...pendingMessages],
    [pendingMessages, storedMessages]
  )
  const hasDraft = input.trim() !== '' || imageAttachments.length > 0
  const isGenerating = isSending || isRetryingResponse
  const canAttachMoreImages =
    imageAttachments.length < attachmentConfig.maxImageAttachments
  const canAddImageUrl =
    isValidImageUrl(imageUrlInput.trim()) && canAttachMoreImages

  useEffect(() => {
    if (activeConversationId === null && conversations.length > 0) {
      setActiveConversationId(conversations[0].id)
    }
  }, [activeConversationId, conversations])

  useEffect(() => {
    if (activeConversationId === null) {
      restoredDraftConversationIdRef.current = null
      setInput('')
      setImageUrlInput('')
      setIsImageUrlOpen(false)
      setImageAttachments([])
      return
    }

    let cancelled = false
    const storedDraft = getStoredChatDraft(activeConversationId)
    restoredDraftConversationIdRef.current = activeConversationId
    setInput(storedDraft.input)
    setImageUrlInput(storedDraft.imageUrlInput)
    setIsImageUrlOpen(
      storedDraft.isImageUrlOpen || storedDraft.imageUrlInput.trim() !== ''
    )
    setImageAttachments(
      storedDraft.externalImageAttachments.map((attachment) => ({
        ...attachment,
        source: 'external' as const,
      }))
    )

    void (async () => {
      const response = await getPendingChatAttachments(activeConversationId)
      if (cancelled) return
      if (!response.success) {
        toast.error(response.message || t('Failed to load image attachments'))
        return
      }
      const uploadedAttachments = (response.data ?? []).map(
        mapChatAttachmentToImageAttachment
      )
      setImageAttachments((attachments) => {
        const uploadedById = new Map(
          uploadedAttachments.map((attachment) => [attachment.id, attachment])
        )
        for (const attachment of attachments) {
          if (attachment.source === 'uploaded') {
            uploadedById.set(attachment.id, attachment)
          }
        }
        return [
          ...uploadedById.values(),
          ...attachments.filter(
            (attachment) => attachment.source === 'external'
          ),
        ]
      })
    })()

    return () => {
      cancelled = true
    }
  }, [activeConversationId, t])

  useEffect(() => {
    if (
      activeConversationId === null ||
      restoredDraftConversationIdRef.current !== activeConversationId ||
      isSending
    ) {
      return
    }

    setStoredChatDraft(activeConversationId, {
      input,
      imageUrlInput,
      isImageUrlOpen,
      externalImageAttachments: imageAttachments
        .filter((attachment) => attachment.source === 'external')
        .map((attachment) => ({
          id: attachment.id,
          url: attachment.url,
        })),
    })
  }, [
    activeConversationId,
    imageAttachments,
    imageUrlInput,
    input,
    isImageUrlOpen,
    isSending,
  ])

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

  useEffect(() => {
    if (activeConversationId === null) {
      setResponseFailure(null)
      return
    }
    if (isGenerating) {
      return
    }
    if (
      lastStoredMessage?.role === 'assistant' &&
      isRetryableChatMessageStatus(lastStoredMessage.status)
    ) {
      setResponseFailure({
        conversationId: activeConversationId,
        message:
          lastStoredMessage.error_message ||
          getChatMessageStateMeta(lastStoredMessage, t)?.detail ||
          t('Failed to send message'),
      })
      return
    }
    setResponseFailure(null)
  }, [activeConversationId, isGenerating, lastStoredMessage, t])

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

  async function recoverAfterSendFailure(
    conversationId: number,
    content: string,
    attachmentsForRequest: ChatImageAttachment[],
    message: string
  ) {
    const response = await getChatMessages(conversationId)
    const lastMessage = response.data?.at(-1)
    if (
      response.success &&
      lastMessage?.role === 'assistant' &&
      isRetryableChatMessageStatus(lastMessage.status)
    ) {
      setResponseFailure({
        conversationId,
        message: lastMessage.error_message || message,
      })
    } else if (response.success && lastMessage?.role === 'user') {
      setResponseFailure({
        conversationId,
        message,
      })
    } else {
      setInput(content)
      setImageAttachments(attachmentsForRequest)
      setResponseFailure(null)
    }
    await refreshChatData(conversationId)
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
    clearStoredChatDraft(response.data.id)
    setResponseFailure(null)
    setActiveConversationId(response.data.id)
    setInput('')
    setPendingMessages([])
    setImageAttachments([])
    setImageUrlInput('')
    setIsImageUrlOpen(false)
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
    clearStoredChatDraft(conversation.id)
    if (activeConversationId === conversation.id) {
      setActiveConversationId(null)
      setPendingMessages([])
      setResponseFailure(null)
      setImageAttachments([])
      setImageUrlInput('')
      setIsImageUrlOpen(false)
    }
    await queryClient.invalidateQueries({
      queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    })
  }

  function handleAddImageUrl() {
    const url = imageUrlInput.trim()
    if (!isValidImageUrl(url)) return
    if (!canAttachMoreImages) {
      toast.error(t('Too many files. Some were not added.'))
      return
    }
    setImageAttachments((attachments) => [
      ...attachments,
      {
        id: `${Date.now()}-${attachments.length}`,
        url,
        source: 'external',
      },
    ])
    setImageUrlInput('')
    setIsImageUrlOpen(false)
  }

  async function handleRemoveImageAttachment(id: string) {
    const attachment = imageAttachments.find((item) => item.id === id)
    if (!attachment) return

    if (
      attachment.source === 'uploaded' &&
      activeConversationId !== null &&
      Number.isInteger(Number(attachment.id))
    ) {
      const response = await deleteChatAttachment(
        activeConversationId,
        Number(attachment.id)
      )
      if (!response.success) {
        toast.error(response.message || t('Failed to remove image'))
        return
      }
    }

    setImageAttachments((attachments) =>
      attachments.filter((item) => item.id !== id)
    )
  }

  async function handleUploadImageFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (files.length === 0) return

    const capacity =
      attachmentConfig.maxImageAttachments - imageAttachments.length
    if (capacity <= 0) {
      toast.error(t('Too many files. Some were not added.'))
      return
    }

    const validFiles = files.filter((file) => {
      if (
        file.type &&
        !attachmentConfig.allowedImageMimeTypes.includes(file.type)
      ) {
        return false
      }
      if (file.size > attachmentConfig.maxImageFileSizeBytes) {
        return false
      }
      return true
    })

    if (validFiles.length < files.length) {
      if (
        files.some(
          (file) =>
            !!file.type &&
            !attachmentConfig.allowedImageMimeTypes.includes(file.type)
        )
      ) {
        toast.error(
          t(
            'One or more files were skipped because their format is not allowed.'
          )
        )
      }
      if (
        files.some((file) => file.size > attachmentConfig.maxImageFileSizeBytes)
      ) {
        toast.error(t('One or more files exceeded the size limit.'))
      }
    }

    const selectedFiles = validFiles.slice(0, capacity)
    if (selectedFiles.length === 0) {
      return
    }
    if (selectedFiles.length < validFiles.length) {
      toast.error(t('Too many files. Some were not added.'))
    }

    setIsUploadingAttachment(true)
    try {
      const conversation = await ensureConversation(input.trim() || t('Image'))
      const uploadedAttachments: ChatImageAttachment[] = []
      for (const file of selectedFiles) {
        const response = await uploadChatAttachment(conversation.id, file)
        if (!response.success || !response.data) {
          throw new Error(response.message || t('Failed to load image'))
        }
        uploadedAttachments.push({
          id: String(response.data.id),
          url: response.data.public_url,
          fileName: response.data.file_name,
          source: 'uploaded',
        })
      }
      setImageAttachments((attachments) =>
        attachments.concat(uploadedAttachments)
      )
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t('Failed to load image')
      toast.error(message)
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  function handleStopGenerating() {
    abortControllerRef.current?.abort()
  }

  async function handleSend() {
    const content = input.trim()
    if ((!content && imageAttachments.length === 0) || isGenerating) return
    if (!selectedModel) {
      toast.error(t('Select a model before sending.'))
      return
    }

    const attachmentsForRequest = imageAttachments
    const contentParts = buildChatContentParts(content, attachmentsForRequest)
    setIsSending(true)
    setResponseFailure(null)
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setInput('')
    setImageAttachments([])
    setImageUrlInput('')
    setIsImageUrlOpen(false)
    const thinkingText = t('Thinking...')
    const userMessage = createPendingMessage(
      'user',
      content || t('Image'),
      selectedModel,
      contentParts
    )
    const assistantPlaceholder = createPendingMessage(
      'assistant',
      thinkingText,
      selectedModel,
      undefined,
      'streaming'
    )
    setPendingMessages([userMessage, assistantPlaceholder])

    let conversationIdForRefresh = activeConversationId
    try {
      const conversation = await ensureConversation(content || t('Image'))
      conversationIdForRefresh = conversation.id
      let streamedContent = ''
      await streamChatMessage(
        conversation.id,
        {
          content,
          content_parts: contentParts,
          model: selectedModel,
          group: selectedGroup || undefined,
        },
        (delta) => {
          streamedContent += delta
          setPendingMessages((messages) =>
            messages.map((message) =>
              message.id === assistantPlaceholder.id
                ? { ...message, content: streamedContent || thinkingText }
                : message
            )
          )
        },
        abortController.signal
      )
      clearStoredChatDraft(conversation.id)
      setPendingMessages([])
      await refreshChatData(conversation.id)
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError'
      if (aborted) {
        setPendingMessages([])
        if (conversationIdForRefresh !== null) {
          await refreshChatData(conversationIdForRefresh)
        }
        return
      }
      const errorMessage = error instanceof Error ? error.message : ''
      const message =
        errorMessage && errorMessage !== 'Failed to send message'
          ? errorMessage
          : t('Failed to send message')
      toast.error(message)
      setPendingMessages([])
      if (conversationIdForRefresh !== null) {
        await recoverAfterSendFailure(
          conversationIdForRefresh,
          content,
          attachmentsForRequest,
          message
        )
      } else {
        setInput(content)
        setImageAttachments(attachmentsForRequest)
      }
    } finally {
      abortControllerRef.current = null
      setIsSending(false)
    }
  }

  async function handleRetryResponse() {
    if (activeConversationId === null || isGenerating) return
    if (!selectedModel) {
      toast.error(t('Select a model before sending.'))
      return
    }

    const conversationId = activeConversationId
    setIsRetryingResponse(true)
    setResponseFailure(null)
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    const thinkingText = t('Thinking...')
    const assistantPlaceholder = createPendingMessage(
      'assistant',
      thinkingText,
      selectedModel,
      undefined,
      'streaming'
    )
    setPendingMessages([assistantPlaceholder])

    try {
      let streamedContent = ''
      await streamChatRegeneration(
        conversationId,
        {
          model: selectedModel,
          group: selectedGroup || undefined,
        },
        (delta) => {
          streamedContent += delta
          setPendingMessages((messages) =>
            messages.map((message) =>
              message.id === assistantPlaceholder.id
                ? { ...message, content: streamedContent || thinkingText }
                : message
            )
          )
        },
        abortController.signal
      )
      setResponseFailure(null)
      setPendingMessages([])
      await refreshChatData(conversationId)
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError'
      setPendingMessages([])
      if (aborted) {
        await refreshChatData(conversationId)
        return
      }
      const message = getChatErrorMessage(error, t('Failed to send message'))
      toast.error(message)
      setResponseFailure({
        conversationId,
        message,
      })
      await refreshChatData(conversationId)
    } finally {
      abortControllerRef.current = null
      setIsRetryingResponse(false)
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
                      setImageAttachments([])
                      setImageUrlInput('')
                      setIsImageUrlOpen(false)
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
        <div className='border-border border-b p-3'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
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
          <div className='border-border bg-muted/30 mt-3 flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex min-w-0 items-center gap-2'>
              <div className='bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border'>
                <WalletCards className='size-4' />
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-medium'>{t('Chat billing')}</p>
                <p className='text-muted-foreground truncate text-xs'>
                  {t('Chat and API use the same account balance.')}
                </p>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='outline'>{t('Shared account balance')}</Badge>
              <Badge variant={hasActiveSubscription ? 'default' : 'secondary'}>
                <Crown className='size-3' />
                {subscriptionStatusQuery.isLoading
                  ? t('Loading...')
                  : hasActiveSubscription
                    ? `${activeSubscriptionCount} ${t('active')}`
                    : t('No Active')}
              </Badge>
              <Button
                size='sm'
                variant='outline'
                render={<Link to='/console/wallet' />}
              >
                <WalletCards className='size-4' />
                {t('Wallet')}
              </Button>
            </div>
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
              {responseFailure?.conversationId === activeConversationId && (
                <Alert variant='destructive'>
                  <AlertTriangle className='size-4' />
                  <AlertTitle>{t('Response failed')}</AlertTitle>
                  <AlertDescription className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <span>{responseFailure.message}</span>
                    <Button
                      disabled={isGenerating || !selectedModel}
                      onClick={handleRetryResponse}
                      size='sm'
                      variant='outline'
                    >
                      {isRetryingResponse ? (
                        <Loader2 className='size-4 animate-spin' />
                      ) : (
                        <RotateCcw className='size-4' />
                      )}
                      {t('Retry response')}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className='border-border bg-background border-t p-3'>
          <div className='mx-auto flex max-w-5xl flex-col gap-2'>
            <input
              ref={fileInputRef}
              accept={attachmentConfig.allowedImageMimeTypes.join(',')}
              className='hidden'
              multiple
              onChange={handleUploadImageFiles}
              type='file'
            />
            {imageAttachments.length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {imageAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className='border-border bg-muted/40 flex max-w-full items-center gap-2 rounded-lg border px-2 py-1 text-xs'
                  >
                    <ImageIcon className='text-muted-foreground size-3.5' />
                    <span className='max-w-56 truncate'>
                      {attachment.fileName || attachment.url}
                    </span>
                    <Button
                      aria-label={t('Remove')}
                      onClick={() => handleRemoveImageAttachment(attachment.id)}
                      size='icon-xs'
                      variant='ghost'
                    >
                      <X className='size-3' />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {isImageUrlOpen && (
              <div className='flex flex-col gap-2 sm:flex-row'>
                <Input
                  disabled={isGenerating}
                  onChange={(event) => setImageUrlInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleAddImageUrl()
                    }
                  }}
                  placeholder={`${t('Image')} ${t('URL')}`}
                  type='url'
                  value={imageUrlInput}
                />
                <div className='flex gap-2'>
                  <Button
                    disabled={!canAddImageUrl || isGenerating}
                    onClick={handleAddImageUrl}
                    variant='outline'
                  >
                    {t('Add')}
                  </Button>
                  <Button
                    onClick={() => {
                      setImageUrlInput('')
                      setIsImageUrlOpen(false)
                    }}
                    variant='ghost'
                  >
                    {t('Cancel')}
                  </Button>
                </div>
              </div>
            )}
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
              disabled={isGenerating}
            />
            <div className='flex items-center justify-between gap-2'>
              <p className='text-muted-foreground text-xs'>
                {t('Enter to send, Shift+Enter for a new line')}
              </p>
              <div className='flex items-center gap-2'>
                <Button
                  disabled={
                    isGenerating ||
                    isUploadingAttachment ||
                    !canAttachMoreImages
                  }
                  onClick={() => fileInputRef.current?.click()}
                  variant='outline'
                >
                  {isUploadingAttachment ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <ImageIcon className='size-4' />
                  )}
                  {t('Upload photo')}
                </Button>
                <Button
                  disabled={
                    isGenerating ||
                    isUploadingAttachment ||
                    !canAttachMoreImages
                  }
                  onClick={() => setIsImageUrlOpen((value) => !value)}
                  variant='outline'
                >
                  {t('URL')}
                </Button>
                {isGenerating ? (
                  <Button variant='outline' onClick={handleStopGenerating}>
                    <Square className='size-4 fill-current' />
                    {t('Stop')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={
                      !hasDraft || !selectedModel || isUploadingAttachment
                    }
                  >
                    <Send className='size-4' />
                    {t('Send')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
