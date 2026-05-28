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
import { useEffect } from 'react'
import * as z from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const DEFAULT_ALLOWED_IMAGE_MIME_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]

function parseAllowedImageMimeTypesText(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

function formatAllowedImageMimeTypes(raw: string) {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const mimeTypes = parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
      if (mimeTypes.length > 0) {
        return mimeTypes.join('\n')
      }
    }
  } catch {
    /* empty */
  }
  return DEFAULT_ALLOWED_IMAGE_MIME_TYPES.join('\n')
}

function normalizeAllowedImageMimeTypesValue(raw: string) {
  return JSON.stringify(
    parseAllowedImageMimeTypesText(formatAllowedImageMimeTypes(raw))
  )
}

const createChatAttachmentSchema = (t: (key: string) => string) =>
  z.object({
    localDir: z
      .string()
      .trim()
      .min(1, {
        message: t('Local storage path is required'),
      }),
    publicBaseURL: z
      .string()
      .trim()
      .superRefine((value, ctx) => {
        if (value === '') {
          return
        }
        try {
          new URL(value)
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('This must be a valid URL or left empty.'),
          })
        }
      }),
    maxImageFileSizeMB: z.coerce
      .number()
      .int()
      .min(1, {
        message: t('Maximum image size must be at least 1 MB'),
      }),
    maxImageCount: z.coerce
      .number()
      .int()
      .min(1, {
        message: t('Maximum image attachments per message must be at least 1'),
      })
      .max(16, {
        message: t('Maximum image attachments per message cannot exceed 16'),
      }),
    allowedImageMimeTypes: z.string().superRefine((value, ctx) => {
      const mimeTypes = parseAllowedImageMimeTypesText(value)
      if (mimeTypes.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('At least one allowed image MIME type is required'),
        })
        return
      }
      for (const mimeType of mimeTypes) {
        if (!mimeType.startsWith('image/')) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('Each MIME type must start with image/'),
          })
          return
        }
      }
    }),
  })

type ChatAttachmentSettingsFormValues = z.infer<
  ReturnType<typeof createChatAttachmentSchema>
>

type ChatAttachmentSettingsSectionProps = {
  defaultValues: {
    localDir: string
    publicBaseURL: string
    maxImageFileSizeMB: number
    maxImageCount: number
    allowedImageMimeTypes: string
  }
}

function normalizePublicBaseURL(value: string) {
  return value.trim().replace(/\/+$/, '')
}

export function ChatAttachmentSettingsSection({
  defaultValues,
}: ChatAttachmentSettingsSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const chatAttachmentSchema = createChatAttachmentSchema(t)

  const form = useForm<ChatAttachmentSettingsFormValues>({
    resolver: zodResolver(chatAttachmentSchema) as Resolver<
      ChatAttachmentSettingsFormValues,
      unknown,
      ChatAttachmentSettingsFormValues
    >,
    defaultValues: {
      ...defaultValues,
      allowedImageMimeTypes: formatAllowedImageMimeTypes(
        defaultValues.allowedImageMimeTypes
      ),
    },
  })

  useEffect(() => {
    form.reset({
      ...defaultValues,
      allowedImageMimeTypes: formatAllowedImageMimeTypes(
        defaultValues.allowedImageMimeTypes
      ),
    })
  }, [defaultValues, form])

  const onSubmit = async (values: ChatAttachmentSettingsFormValues) => {
    const normalizedValues = {
      localDir: values.localDir.trim(),
      publicBaseURL: normalizePublicBaseURL(values.publicBaseURL),
      maxImageFileSizeMB: values.maxImageFileSizeMB,
      maxImageCount: values.maxImageCount,
      allowedImageMimeTypes: JSON.stringify(
        parseAllowedImageMimeTypesText(values.allowedImageMimeTypes)
      ),
    }
    const normalizedDefaults = {
      localDir: defaultValues.localDir.trim(),
      publicBaseURL: normalizePublicBaseURL(defaultValues.publicBaseURL),
      maxImageFileSizeMB: defaultValues.maxImageFileSizeMB,
      maxImageCount: defaultValues.maxImageCount,
      allowedImageMimeTypes: normalizeAllowedImageMimeTypesValue(
        defaultValues.allowedImageMimeTypes
      ),
    }

    if (
      normalizedValues.localDir === normalizedDefaults.localDir &&
      normalizedValues.publicBaseURL === normalizedDefaults.publicBaseURL &&
      normalizedValues.maxImageFileSizeMB ===
        normalizedDefaults.maxImageFileSizeMB &&
      normalizedValues.maxImageCount === normalizedDefaults.maxImageCount &&
      normalizedValues.allowedImageMimeTypes ===
        normalizedDefaults.allowedImageMimeTypes
    ) {
      return
    }

    if (normalizedValues.localDir !== normalizedDefaults.localDir) {
      await updateOption.mutateAsync({
        key: 'chat_attachment.local_dir',
        value: normalizedValues.localDir,
      })
    }

    if (normalizedValues.publicBaseURL !== normalizedDefaults.publicBaseURL) {
      await updateOption.mutateAsync({
        key: 'chat_attachment.public_base_url',
        value: normalizedValues.publicBaseURL,
      })
    }

    if (
      normalizedValues.maxImageFileSizeMB !==
      normalizedDefaults.maxImageFileSizeMB
    ) {
      await updateOption.mutateAsync({
        key: 'chat_attachment.max_image_file_size_mb',
        value: normalizedValues.maxImageFileSizeMB,
      })
    }

    if (normalizedValues.maxImageCount !== normalizedDefaults.maxImageCount) {
      await updateOption.mutateAsync({
        key: 'chat_attachment.max_image_count',
        value: normalizedValues.maxImageCount,
      })
    }

    if (
      normalizedValues.allowedImageMimeTypes !==
      normalizedDefaults.allowedImageMimeTypes
    ) {
      await updateOption.mutateAsync({
        key: 'chat_attachment.allowed_image_mime_types',
        value: normalizedValues.allowedImageMimeTypes,
      })
    }
  }

  return (
    <SettingsSection
      title={t('Chat attachment storage')}
      description={t(
        'Control where uploaded chat images are stored and how their public links are generated.'
      )}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='localDir'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Local storage path')}</FormLabel>
                <FormControl>
                  <Input placeholder='data/chat-attachments' {...field} />
                </FormControl>
                <FormDescription>
                  {t(
                    'Directory used to persist uploaded chat images on the server. Existing attachments keep their saved path.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='publicBaseURL'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Public base URL')}</FormLabel>
                <FormControl>
                  <Input placeholder='https://api.example.com' {...field} />
                </FormControl>
                <FormDescription>
                  {t(
                    'Optional base URL used when generating attachment links. When empty, the server address or current request host is used.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid gap-6 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='maxImageFileSizeMB'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Maximum image size (MB)')}</FormLabel>
                  <FormControl>
                    <Input min={1} step={1} type='number' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t(
                      'Uploaded chat images larger than this limit are rejected before storage.'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='maxImageCount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('Maximum image attachments per message')}
                  </FormLabel>
                  <FormControl>
                    <Input min={1} step={1} type='number' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t(
                      'Applies to both uploaded images and manually added image URLs.'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='allowedImageMimeTypes'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Allowed image MIME types')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={DEFAULT_ALLOWED_IMAGE_MIME_TYPES.join('\n')}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t(
                    'One MIME type per line. Only supported image types such as image/png and image/webp will be accepted.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' disabled={updateOption.isPending}>
            {updateOption.isPending ? t('Saving...') : t('Save Changes')}
          </Button>
        </form>
      </Form>
    </SettingsSection>
  )
}
