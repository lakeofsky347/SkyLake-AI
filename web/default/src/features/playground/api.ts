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
import { API_ENDPOINTS } from './constants'
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelOption,
  GroupOption,
} from './types'

type UserModelOptionPayload = {
  label: string
  value: string
  category?: string
  description?: string
  supported_endpoint_types?: string[]
}

type UserModelsApiResponse = {
  success: boolean
  data?: string[]
  model_options?: UserModelOptionPayload[]
}

const CHAT_COMPATIBLE_ENDPOINT_TYPES = new Set([
  'openai',
  'openai-response',
  'openai-response-compact',
  'anthropic',
  'gemini',
])

function isChatCompatibleModel(
  supportedEndpointTypes: string[] | undefined
): boolean {
  if (!supportedEndpointTypes || supportedEndpointTypes.length === 0) {
    return true
  }
  return supportedEndpointTypes.some((endpoint) =>
    CHAT_COMPATIBLE_ENDPOINT_TYPES.has(endpoint)
  )
}

/**
 * Send chat completion request (non-streaming)
 */
export async function sendChatCompletion(
  payload: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const res = await api.post(API_ENDPOINTS.CHAT_COMPLETIONS, payload, {
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return res.data
}

/**
 * Get user available models
 */
export async function getUserModels(group?: string): Promise<ModelOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_MODELS, {
    params: group ? { group } : undefined,
  })
  const data = res.data as UserModelsApiResponse

  if (!data.success || !Array.isArray(data.data)) {
    return []
  }

  const options: ModelOption[] = Array.isArray(data.model_options)
    ? data.model_options.map((model) => ({
        label: model.label || model.value,
        value: model.value,
        category: model.category,
        description: model.description,
        supportedEndpointTypes: model.supported_endpoint_types,
      }))
    : data.data.map((model: string) => ({
        label: model,
        value: model,
        supportedEndpointTypes: undefined,
      }))

  return options.filter((model) =>
    isChatCompatibleModel(model.supportedEndpointTypes)
  )
}

/**
 * Get user groups
 */
export async function getUserGroups(): Promise<GroupOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_GROUPS)
  const { data } = res

  if (!data.success || !data.data) {
    return []
  }

  const groupData = data.data as Record<string, { desc: string; ratio: number }>

  // label is for button display (name only); desc is for dropdown content
  return Object.entries(groupData).map(([group, info]) => ({
    label: group,
    value: group,
    ratio: info.ratio,
    desc: info.desc,
  }))
}
