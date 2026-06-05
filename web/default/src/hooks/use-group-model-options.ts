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
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getUserGroups, getUserModels } from '@/features/playground/api'
import type {
  GroupOption,
  ModelOption,
} from '@/features/playground/types'

type UseGroupModelOptionsParams = {
  queryScope: string
  selectedGroup: string
  selectedModel: string
  onGroupChange: (group: string) => void
  onModelChange: (model: string) => void
}

type UseGroupModelOptionsResult = {
  groups: GroupOption[]
  models: ModelOption[]
  isLoadingGroups: boolean
  isLoadingModels: boolean
  noModelsMessage: string
  handleGroupChange: (group: string) => void
}

export function useGroupModelOptions({
  queryScope,
  selectedGroup,
  selectedModel,
  onGroupChange,
  onModelChange,
}: UseGroupModelOptionsParams): UseGroupModelOptionsResult {
  const { t } = useTranslation()
  const pendingGroupSwitchRef = useRef<string | null>(null)

  const groupsQuery = useQuery({
    queryKey: [queryScope, 'groups'],
    queryFn: getUserGroups,
    staleTime: 60 * 1000,
  })

  const groups = groupsQuery.data ?? []
  const fallbackGroup = useMemo(
    () =>
      groups.find((group) => group.value === 'default')?.value ??
      groups[0]?.value ??
      '',
    [groups]
  )

  const handleGroupChange = useCallback(
    (group: string) => {
      if (group !== selectedGroup) {
        pendingGroupSwitchRef.current = group
      }
      onGroupChange(group)
    },
    [onGroupChange, selectedGroup]
  )

  useEffect(() => {
    if (!selectedGroup && fallbackGroup) {
      handleGroupChange(fallbackGroup)
    }
  }, [fallbackGroup, handleGroupChange, selectedGroup])

  const shouldLoadModels =
    selectedGroup !== '' || (groupsQuery.isSuccess && groups.length === 0)

  const modelsQuery = useQuery({
    queryKey: [queryScope, 'models', selectedGroup || '__all__'],
    queryFn: () => getUserModels(selectedGroup || undefined),
    enabled: shouldLoadModels,
    staleTime: 60 * 1000,
  })

  const models = modelsQuery.data ?? []

  useEffect(() => {
    if (!modelsQuery.isSuccess) {
      return
    }

    if (models.length === 0) {
      if (selectedModel !== '') {
        onModelChange('')
      }
      pendingGroupSwitchRef.current = null
      return
    }

    if (models.some((model) => model.value === selectedModel)) {
      pendingGroupSwitchRef.current = null
      return
    }

    const fallbackModel = models[0]?.value ?? ''
    if (!fallbackModel) {
      pendingGroupSwitchRef.current = null
      return
    }

    onModelChange(fallbackModel)

    if (selectedModel) {
      const switchedGroup = pendingGroupSwitchRef.current || selectedGroup
      toast.info(
        t(
          'Switched to {{model}} because the previous model is unavailable in {{group}}.',
          {
            model: fallbackModel,
            group: switchedGroup,
          }
        )
      )
    }

    pendingGroupSwitchRef.current = null
  }, [
    models,
    modelsQuery.isSuccess,
    onModelChange,
    selectedGroup,
    selectedModel,
    t,
  ])

  const noModelsMessage =
    selectedGroup && modelsQuery.isSuccess && models.length === 0
      ? t(
          'No models are currently available for the {{group}} group. Switch groups or contact an administrator.',
          {
            group: selectedGroup,
          }
        )
      : ''

  return {
    groups,
    models,
    isLoadingGroups: groupsQuery.isLoading,
    isLoadingModels: modelsQuery.isLoading || modelsQuery.isFetching,
    noModelsMessage,
    handleGroupChange,
  }
}
