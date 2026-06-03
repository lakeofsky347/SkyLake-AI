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
import { type ComponentProps, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AiChat01Icon,
  AiCloud01Icon,
  ApiGatewayIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  ClaudeIcon,
  GoogleGeminiIcon,
  Route02Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import {
  PORTAL_BRAND_NAME,
  SKYLAKE_BRAND_LOGO_DATA_URI,
  SkyLakeBrandMark,
} from '@/components/brand/portal-brand'
import { cn } from '@/lib/utils'
import { Markdown } from '@/components/ui/markdown'
import { AnimateInView } from '@/components/animate-in-view'
import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { useHomePageContent } from './hooks'

type HugeIcon = ComponentProps<typeof HugeiconsIcon>['icon']

function SiteMark(props: { name: string; className?: string }) {
  return (
    <SkyLakeBrandMark
      className={cn('size-8 object-contain', props.className)}
      aria-label={`${props.name} Logo`}
    />
  )
}

function PortalIcon(props: { icon: HugeIcon; className?: string }) {
  return (
    <HugeiconsIcon
      icon={props.icon}
      strokeWidth={1.7}
      className={cn('size-5', props.className)}
    />
  )
}

function ArrowIcon(props: { down?: boolean }) {
  return (
    <HugeiconsIcon
      icon={props.down ? ArrowDown01Icon : ArrowRight01Icon}
      strokeWidth={1.9}
      className='size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:data-[down=true]:translate-y-0.5'
      data-down={props.down}
    />
  )
}

function PortalShell(props: { children: ReactNode; brandName: string }) {
  const navLinks = [
    { title: 'Chat', href: '/chat', requiresAuth: true },
    { title: 'API Console', href: '/console', requiresAuth: true },
    { title: 'Models', href: '#models' },
  ]

  return (
    <PublicLayout
      showMainContainer={false}
      navLinks={navLinks}
      showThemeSwitch={false}
      showNotifications={false}
      siteName={props.brandName}
      logo={<SiteMark name={props.brandName} />}
      headerProps={{ showLanguageSwitcher: true }}
    >
      {props.children}
    </PublicLayout>
  )
}

function SplitCard(props: {
  icon: HugeIcon
  title: string
  description: string
  href: '/chat' | '/console'
  buttonLabel: string
  tone: 'chat' | 'api'
}) {
  return (
    <Link
      to={props.href}
      className={cn(
        'group flex flex-col h-full rounded-2xl border bg-white p-5 text-left shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 sm:p-8',
        props.tone === 'chat'
          ? 'border-[#b9dcff]'
          : 'border-slate-200/60'
      )}
    >
      <div
        className={cn(
          'grid size-12 place-items-center rounded-xl',
          props.tone === 'chat'
            ? 'bg-[#eaf4ff] text-[#0071e3]'
            : 'bg-slate-100 text-slate-950'
        )}
      >
        <PortalIcon icon={props.icon} />
      </div>
      <h2 className='mt-5 text-2xl leading-tight font-semibold tracking-tight text-slate-950 sm:mt-7 sm:text-4xl'>
        {props.title}
      </h2>
      <p className='mt-3 max-w-md text-sm leading-6 text-slate-600 sm:mt-4 sm:text-base sm:leading-7'>
        {props.description}
      </p>
      <div
        className={cn(
          'mt-auto pt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all sm:mt-auto',
          props.tone === 'chat'
            ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white animate-border-flow hover:scale-105 shadow-[0_0_15px_rgba(0,113,227,0.4)]'
            : 'bg-slate-950 text-white hover:bg-slate-800'
        )}
      >
        {props.buttonLabel}
        <ArrowIcon />
      </div>
    </Link>
  )
}

function ModelBadge(props: { label: string; icon?: HugeIcon; children?: ReactNode }) {
  return (
    <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600'>
      {props.icon && <PortalIcon icon={props.icon} className='size-3.5' />}
      {props.children ?? props.label}
    </div>
  )
}

function ModelCard(props: {
  name: string
  label: string
  description: string
  icon: HugeIcon
  accent: string
}) {
  return (
    <article className='group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.1)]'>
      <div
        className={cn(
          'grid size-14 place-items-center rounded-2xl text-white',
          props.accent
        )}
      >
        <PortalIcon icon={props.icon} className='size-7' />
      </div>
      <div className='mt-5'>
        <div className='flex items-center justify-between gap-3'>
          <h3 className='text-xl font-semibold tracking-tight text-slate-950'>
            {props.name}
          </h3>
          <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500'>
            {props.label}
          </span>
        </div>
        <p className='mt-3 text-sm leading-6 text-slate-600'>
          {props.description}
        </p>
      </div>
    </article>
  )
}

function ModelShowcase(props: { brandName: string }) {
  const { t } = useTranslation()
  const models = [
    {
      name: 'ChatGPT',
      label: t('General assistant'),
      description: t(
        'Fast reasoning, writing, coding, and multimodal work for everyday AI tasks.'
      ),
      icon: AiChat01Icon,
      accent: 'bg-[#0a84ff]',
    },
    {
      name: 'Claude',
      label: t('Long-context work'),
      description: t(
        'Strong analysis, document understanding, and careful long-form collaboration.'
      ),
      icon: ClaudeIcon,
      accent: 'bg-[#111827]',
    },
    {
      name: 'Gemini',
      label: t('Multimodal creation'),
      description: t(
        'Flexible text, vision, and structured output for product teams and builders.'
      ),
      icon: GoogleGeminiIcon,
      accent: 'bg-[#8b5cf6]',
    },
    {
      name: 'Grok',
      label: t('Realtime exploration'),
      description: t(
        'Responsive conversational intelligence for fast research and iteration.'
      ),
      icon: SparklesIcon,
      accent: 'bg-[#0f172a]',
    },
  ]

  return (
    <section
      id='models'
      className='relative border-t border-slate-200 bg-[#f5f5f7] px-4 py-20 sm:px-6 md:py-28'
    >
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='text-center'>
          <div className='flex justify-center'>
            <ModelBadge label={t('Model gallery')} icon={AiCloud01Icon} />
          </div>
          <h2 className='mx-auto mt-6 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-6xl'>
            {t('Choose the model that fits the moment.')}
          </h2>
          <p className='mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600'>
            {t(
              '{{brandName}} brings leading model families into one clean access layer for chat and API workflows.',
              {
                brandName: props.brandName,
              }
            )}
          </p>
        </AnimateInView>

        <AnimateInView
          animation='fade-up'
          className='mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
        >
          {models.map((model) => (
            <ModelCard key={model.name} {...model} />
          ))}
        </AnimateInView>

        <AnimateInView
          animation='fade-up'
          className='mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.05)] sm:p-6'
        >
          <div className='grid gap-4 sm:grid-cols-3'>
            {[
              [CheckmarkCircle01Icon, 'Unified billing'],
              [Route02Icon, 'Model routing'],
              [ApiGatewayIcon, 'One API gateway'],
            ].map(([icon, label]) => (
              <div key={label as string} className='flex items-center gap-3'>
                <div className='grid size-9 place-items-center rounded-full bg-[#eaf4ff] text-[#0071e3]'>
                  <PortalIcon icon={icon as HugeIcon} className='size-4' />
                </div>
                <span className='text-sm font-medium text-slate-700'>
                  {t(label as string)}
                </span>
              </div>
            ))}
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}

export function Home() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const isAuthenticated = !!auth.user
  const { content, isLoaded, isUrl } = useHomePageContent()
  const portalBrandName = PORTAL_BRAND_NAME

  if (!isLoaded) {
    return (
      <PortalShell brandName={portalBrandName}>
        <main className='flex min-h-screen items-center justify-center bg-white'>
          <div className='text-slate-500'>{t('Loading...')}</div>
        </main>
      </PortalShell>
    )
  }

  if (content) {
    return (
      <PortalShell brandName={portalBrandName}>
        <main className='overflow-x-hidden bg-white text-slate-950'>
          {isUrl ? (
            <iframe
              src={content}
              className='h-screen w-full border-none'
              title={t('Custom Home Page')}
            />
          ) : (
            <div className='container mx-auto py-8'>
              <Markdown className='custom-home-content'>{content}</Markdown>
            </div>
          )}
        </main>
      </PortalShell>
    )
  }

  return (
    <PortalShell brandName={portalBrandName}>
      <main className='overflow-hidden bg-white text-slate-950'>
        <section className='relative min-h-[calc(100svh-1px)] px-4 pt-24 pb-10 sm:px-6 sm:pt-28 sm:pb-12 md:pt-36'>
          <div
            aria-hidden='true'
            className='absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_72%)]'
          />
          <div className='relative z-10 mx-auto max-w-6xl'>
            <div className='mx-auto max-w-4xl text-center'>
              <div className='mb-6 flex justify-center sm:mb-8'>
                <SkyLakeBrandMark className='size-16 drop-shadow-[0_18px_40px_rgba(37,99,235,0.18)] sm:size-20' />
              </div>
              <h1 className='text-5xl leading-none font-semibold tracking-tight text-slate-950 sm:text-7xl lg:text-8xl'>
                {portalBrandName}
              </h1>
              <p className='mx-auto mt-4 max-w-2xl text-lg leading-7 text-slate-600 sm:mt-6 sm:text-2xl sm:leading-8'>
                {t('One account. Two ways to use AI.')}
              </p>
            </div>

            <div className='mt-8 grid gap-3 sm:mt-12 sm:gap-5 md:grid-cols-2'>
              <SplitCard
                icon={AiChat01Icon}
                title={t('Chat workspace')}
                description={t(
                  'Use ChatGPT, Claude, Gemini, Grok and more from one clean conversation workspace.'
                )}
                href='/chat'
                buttonLabel={isAuthenticated ? t('Open Chat') : t('Sign in for Chat')}
                tone='chat'
              />
              <SplitCard
                icon={ApiGatewayIcon}
                title={t('API Console')}
                description={t(
                  'Create API keys, route requests, monitor usage, and connect your applications.'
                )}
                href='/console'
                buttonLabel={
                  isAuthenticated ? t('Open API Console') : t('Sign in for API')
                }
                tone='api'
              />
            </div>

            <div className='mt-10 flex justify-center'>
              <a
                href='#models'
                className='group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:text-slate-950'
              >
                {t('Scroll to model showcase')}
                <ArrowIcon down />
              </a>
            </div>
          </div>
        </section>

        <ModelShowcase brandName={portalBrandName} />
      </main>
      <Footer
        name={portalBrandName}
        logo={SKYLAKE_BRAND_LOGO_DATA_URI}
        copyright={t('All rights reserved by this site.')}
        compact
        showLegalLinks={false}
      />
    </PortalShell>
  )
}
