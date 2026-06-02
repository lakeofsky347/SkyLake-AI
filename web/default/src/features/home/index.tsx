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
  AiCloud01Icon,
  AnalyticsUpIcon,
  ApiGatewayIcon,
  ArrowRight01Icon,
  ChartLineData01Icon,
  CheckmarkCircle01Icon,
  Key01Icon,
  Route02Icon,
  Shield01Icon,
  UserGroup02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { AnimateInView } from '@/components/animate-in-view'
import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { useHomePageContent } from './hooks'

const PORTAL_BRAND_NAME = 'SkyLake AI'

type HugeIcon = ComponentProps<typeof HugeiconsIcon>['icon']

function SkyLakeMark(props: { className?: string }) {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'relative grid size-8 place-items-center overflow-hidden rounded-lg bg-[#f5f8ff]',
        props.className
      )}
    >
      <span className='absolute inset-x-1 bottom-1 h-2 rounded-[999px] bg-[#0a84ff]/15' />
      <span className='absolute top-2 left-1.5 h-3 w-5 rounded-[999px] border-2 border-[#0a84ff] border-b-transparent' />
      <span className='absolute right-1.5 bottom-2 h-2.5 w-4 rounded-[999px] bg-[#56ccff]/40' />
    </div>
  )
}

function PortalIcon(props: { icon: HugeIcon; className?: string }) {
  return (
    <HugeiconsIcon
      icon={props.icon}
      strokeWidth={1.6}
      className={cn('size-5', props.className)}
    />
  )
}

function ArrowIcon() {
  return (
    <HugeiconsIcon
      icon={ArrowRight01Icon}
      strokeWidth={1.8}
      className='size-4 transition-transform duration-200 group-hover:translate-x-0.5'
    />
  )
}

function PortalShell(props: { children: ReactNode }) {
  const navLinks = [
    { title: 'Chat', href: '/chat', requiresAuth: true },
    { title: 'API Console', href: '/console', requiresAuth: true },
    { title: 'Pricing', href: '/pricing' },
    { title: 'Models', href: '/models', requiresAuth: true },
  ]

  return (
    <PublicLayout
      showMainContainer={false}
      navLinks={navLinks}
      showThemeSwitch={false}
      showNotifications={false}
      siteName={PORTAL_BRAND_NAME}
      logo={<SkyLakeMark />}
      headerProps={{ showLanguageSwitcher: true }}
    >
      {props.children}
    </PublicLayout>
  )
}

function StatusDot(props: { label: string }) {
  return (
    <span className='inline-flex items-center gap-1.5 text-xs text-slate-500'>
      <span className='skylake-status-dot size-1.5 rounded-full bg-emerald-500' />
      {props.label}
    </span>
  )
}

function MetricCard(props: {
  label: string
  value: string
  delta: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]',
        props.className
      )}
    >
      <p className='text-xs text-slate-500'>{props.label}</p>
      <p className='mt-2 text-2xl font-semibold text-slate-950'>
        {props.value}
      </p>
      <p className='mt-2 text-xs text-emerald-600'>{props.delta}</p>
    </div>
  )
}

function ProductPreview() {
  const { t } = useTranslation()

  const navItems: [string, HugeIcon][] = [
    ['Overview', ApiGatewayIcon],
    ['Requests', ChartLineData01Icon],
    ['Routes', Route02Icon],
    ['Models', AiCloud01Icon],
    ['Analytics', AnalyticsUpIcon],
    ['Keys', Key01Icon],
    ['Guardrails', Shield01Icon],
  ]

  const routes = [
    { name: 'GPT-4o', share: '34.7%', tone: 'bg-slate-950 text-white' },
    { name: 'Claude 3.5', share: '25.8%', tone: 'bg-amber-100 text-amber-900' },
    { name: 'Gemini 1.5', share: '19.9%', tone: 'bg-blue-100 text-blue-700' },
    { name: 'Other', share: '5.8%', tone: 'bg-slate-100 text-slate-500' },
  ]

  const rows = [
    ['10:24:31', '200', 'POST', '/v1/chat/completions', 'GPT-4o', '342ms'],
    ['10:24:29', '200', 'POST', '/v1/embeddings', 'text-embedding', '198ms'],
    ['10:24:28', '200', 'POST', '/v1/responses', 'Claude 3.5', '280ms'],
    ['10:24:27', '429', 'POST', '/v1/chat/completions', 'GPT-4o', '--'],
  ]

  return (
    <div className='portal-product-shell mx-auto mt-12 w-full max-w-6xl rounded-xl border border-slate-200 bg-white text-left shadow-[0_28px_90px_rgba(15,23,42,0.16)]'>
      <div className='flex min-h-[560px] overflow-hidden rounded-xl'>
        <aside className='hidden w-56 shrink-0 border-r border-slate-200 bg-slate-50/70 p-5 md:block'>
          <div className='mb-6 flex items-center gap-2'>
            <SkyLakeMark className='size-7' />
            <span className='text-sm font-semibold text-slate-950'>
              {PORTAL_BRAND_NAME}
            </span>
          </div>
          <div className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500'>
            Acme Corp
          </div>
          <nav className='mt-5 flex flex-col gap-1 text-sm'>
            {navItems.map(([label, icon], index) => (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
                  index === 0
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-white hover:text-slate-950'
                )}
              >
                <PortalIcon icon={icon as HugeIcon} className='size-4' />
                {t(label)}
              </div>
            ))}
          </nav>
          <div className='mt-24 flex flex-col gap-2 text-xs text-slate-500'>
            <div className='flex items-center gap-2'>
              <PortalIcon icon={CheckmarkCircle01Icon} className='size-4' />
              {t('Docs')}
            </div>
            <StatusDot label={t('Status')} />
          </div>
        </aside>

        <div className='min-w-0 flex-1 bg-white p-4 sm:p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <p className='text-sm font-semibold text-slate-950'>
                {t('Overview')}
              </p>
              <p className='mt-1 text-xs text-slate-500'>
                {t('Unified model routing and usage control')}
              </p>
            </div>
            <div className='flex items-center gap-3'>
              <StatusDot label={t('Live')} />
              <div className='rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500'>
                {t('Past 7 days')}
              </div>
            </div>
          </div>

          <div className='mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <MetricCard
              label={t('Total requests')}
              value='12.45M'
              delta={t('16.8% vs previous 7 days')}
            />
            <MetricCard
              label={t('Success rate')}
              value='99.62%'
              delta={t('0.7% vs previous 7 days')}
            />
            <MetricCard
              label={t('Total tokens')}
              value='842.7B'
              delta={t('21.3% vs previous 7 days')}
            />
            <MetricCard
              label={t('Avg. latency')}
              value='312ms'
              delta={t('6.1% vs previous 7 days')}
            />
          </div>

          <div className='mt-4 grid gap-4 lg:grid-cols-[1fr_1.25fr]'>
            <div className='rounded-lg border border-slate-200 bg-white p-4'>
              <p className='text-sm font-semibold text-slate-950'>
                {t('Model routing')}
              </p>
              <p className='mt-1 text-xs text-slate-500'>
                {t('Requests by model')}
              </p>
              <div className='mt-7 flex items-center gap-4'>
                <div className='relative grid size-24 shrink-0 place-items-center rounded-full bg-blue-50 text-center'>
                  <div className='absolute inset-3 rounded-full border border-blue-200' />
                  <div>
                    <p className='text-xs text-slate-500'>
                      {t('All requests')}
                    </p>
                    <p className='text-lg font-semibold text-slate-950'>
                      12.45M
                    </p>
                  </div>
                </div>
                <div className='space-y-2'>
                  {routes.map((route) => (
                    <div key={route.name} className='flex items-center gap-2'>
                      <div
                        className={cn(
                          'grid size-9 place-items-center rounded-lg text-[11px] font-semibold',
                          route.tone
                        )}
                      >
                        {route.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className='text-xs font-medium text-slate-700'>
                          {route.name}
                        </p>
                        <p className='text-[11px] text-slate-500'>
                          {route.share}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                to='/models'
                className='group mt-6 inline-flex items-center gap-1 text-xs font-medium text-blue-600'
              >
                {t('View routes')}
                <ArrowIcon />
              </Link>
            </div>

            <div className='space-y-4'>
              <div className='rounded-lg border border-slate-200 bg-white p-4'>
                <p className='text-sm font-semibold text-slate-950'>
                  {t('Requests over time')}
                </p>
                <div className='mt-5 h-32'>
                  <svg
                    aria-hidden='true'
                    viewBox='0 0 420 140'
                    className='h-full w-full overflow-visible'
                  >
                    <path
                      className='skylake-chart-line'
                      d='M0 112 C 38 70, 54 78, 76 61 S 118 93, 146 66 S 188 72, 212 43 S 250 28, 284 40 S 328 88, 350 72 S 386 36, 420 58'
                      fill='none'
                      stroke='#0a84ff'
                      strokeWidth='4'
                      strokeLinecap='round'
                    />
                    <path
                      d='M0 112 C 38 70, 54 78, 76 61 S 118 93, 146 66 S 188 72, 212 43 S 250 28, 284 40 S 328 88, 350 72 S 386 36, 420 58 L420 140 L0 140 Z'
                      fill='url(#requestsGradient)'
                    />
                    <defs>
                      <linearGradient
                        id='requestsGradient'
                        x1='0'
                        x2='0'
                        y1='0'
                        y2='1'
                      >
                        <stop stopColor='#0a84ff' stopOpacity='0.18' />
                        <stop offset='1' stopColor='#0a84ff' stopOpacity='0' />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <div className='rounded-lg border border-slate-200 bg-white p-4'>
                <p className='text-sm font-semibold text-slate-950'>
                  {t('Recent requests')}
                </p>
                <div className='mt-4 overflow-hidden'>
                  <div className='grid grid-cols-[0.7fr_0.45fr_0.55fr_1.35fr_1fr_0.55fr] gap-2 border-b border-slate-100 pb-2 text-[11px] text-slate-400'>
                    <span>{t('Time')}</span>
                    <span>{t('Status')}</span>
                    <span>{t('Method')}</span>
                    <span>{t('Endpoint')}</span>
                    <span>{t('Model')}</span>
                    <span>{t('Latency')}</span>
                  </div>
                  {rows.map((row) => (
                    <div
                      key={`${row[0]}-${row[3]}`}
                      className='grid grid-cols-[0.7fr_0.45fr_0.55fr_1.35fr_1fr_0.55fr] gap-2 py-2 text-[11px] text-slate-600'
                    >
                      <span>{row[0]}</span>
                      <span
                        className={cn(
                          'font-medium',
                          row[1] === '429'
                            ? 'text-rose-500'
                            : 'text-emerald-600'
                        )}
                      >
                        {row[1]}
                      </span>
                      <span>{row[2]}</span>
                      <span className='truncate'>{row[3]}</span>
                      <span className='truncate'>{row[4]}</span>
                      <span>{row[5]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CapabilitySection(props: {
  icon: HugeIcon
  title: string
  body: string
  link: string
  children: ReactNode
  reverse?: boolean
}) {
  const { t } = useTranslation()

  return (
    <AnimateInView
      as='section'
      className='grid items-center gap-10 border-t border-slate-200 py-16 md:grid-cols-2 md:py-24'
    >
      <div className={cn(props.reverse && 'md:order-2')}>
        <div className='mb-5 grid size-12 place-items-center rounded-lg bg-blue-50 text-blue-600'>
          <PortalIcon icon={props.icon} />
        </div>
        <h2 className='text-3xl leading-tight font-semibold text-slate-950 sm:text-4xl'>
          {props.title}
        </h2>
        <p className='mt-4 max-w-lg text-base leading-7 text-slate-600'>
          {props.body}
        </p>
        <Link
          to={props.link}
          className='group mt-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600'
        >
          {t('Learn more')}
          <ArrowIcon />
        </Link>
      </div>
      <div className={cn(props.reverse && 'md:order-1')}>{props.children}</div>
    </AnimateInView>
  )
}

function ModelFlowVisual() {
  const { t } = useTranslation()
  const providers = ['OpenAI', 'Claude', 'Gemini', 'DeepSeek', 'Qwen']
  return (
    <div className='mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]'>
      <div className='flex items-center gap-4'>
        <div className='grid size-16 place-items-center rounded-lg border border-blue-200 bg-blue-50'>
          <SkyLakeMark className='size-10' />
        </div>
        <div className='skylake-route-line h-px flex-1 bg-gradient-to-r from-blue-300 to-transparent' />
        <div className='flex flex-col gap-2'>
          {providers.map((provider) => (
            <div
              key={provider}
              className='flex min-w-36 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'
            >
              <span>{provider}</span>
              <span
                className='skylake-status-dot size-1.5 rounded-full bg-emerald-500'
                aria-label={t('Online')}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AnalyticsVisual() {
  const { t } = useTranslation()

  return (
    <div className='grid gap-4 sm:grid-cols-[1.2fr_0.8fr]'>
      <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]'>
        <p className='text-sm font-semibold text-slate-950'>
          {t('Latency (p95)')}
        </p>
        <p className='mt-2 text-3xl font-semibold text-slate-950'>312ms</p>
        <p className='mt-1 text-xs text-emerald-600'>6.1%</p>
        <svg viewBox='0 0 320 150' className='mt-4 h-36 w-full'>
          <path
            className='skylake-chart-line'
            d='M0 110 C 20 72, 34 95, 49 58 S 82 82, 101 55 S 139 112, 160 76 S 199 33, 224 57 S 263 118, 283 71 S 306 41, 320 62'
            fill='none'
            stroke='#0a84ff'
            strokeWidth='4'
            strokeLinecap='round'
          />
        </svg>
      </div>
      <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]'>
        {[
          ['Total requests', '12.45M'],
          ['Tokens', '842.7B'],
          ['Total cost', '$28,541.32'],
        ].map(([label, value]) => (
          <div
            key={label}
            className='flex items-center justify-between border-b border-slate-100 py-4 last:border-b-0'
          >
            <span className='text-sm text-slate-500'>{t(label)}</span>
            <span className='text-sm font-semibold text-slate-950'>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamsVisual() {
  const { t } = useTranslation()

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]'>
        <p className='mb-4 text-sm font-semibold text-slate-950'>
          {t('Members')}
        </p>
        {[
          ['AM', 'Alex Morgan', 'Owner'],
          ['SK', 'Sarah Kim', 'Developer'],
          ['JD', 'James Diaz', 'Developer'],
          ['RW', 'Riya Wang', 'Viewer'],
        ].map(([initials, name, role]) => (
          <div key={name} className='flex items-center gap-3 py-2'>
            <span className='grid size-8 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700'>
              {initials}
            </span>
            <span className='min-w-0 flex-1 truncate text-sm text-slate-700'>
              {name}
            </span>
            <Badge variant='secondary' className='text-[11px]'>
              {t(role)}
            </Badge>
          </div>
        ))}
      </div>
      <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]'>
        <p className='mb-4 text-sm font-semibold text-slate-950'>
          {t('API Keys')}
        </p>
        {['sk_live_****************', 'sk_test_****************'].map((key) => (
          <div
            key={key}
            className='mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600'
          >
            {key}
          </div>
        ))}
        <div className='mt-5 text-sm font-medium text-blue-600'>
          + {t('Create API Key')}
        </div>
      </div>
    </div>
  )
}

export function Home() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const isAuthenticated = !!auth.user
  const { content, isLoaded, isUrl } = useHomePageContent()

  if (!isLoaded) {
    return (
      <PortalShell>
        <main className='flex min-h-screen items-center justify-center bg-white'>
          <div className='text-slate-500'>{t('Loading...')}</div>
        </main>
      </PortalShell>
    )
  }

  if (content) {
    return (
      <PortalShell>
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
    <PortalShell>
      <main className='overflow-hidden bg-white text-slate-950'>
        <section className='relative px-4 pt-28 pb-14 sm:px-6 md:pt-32'>
          <div
            aria-hidden='true'
            className='absolute inset-x-0 top-0 -z-0 h-[620px] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_74%)]'
          />
          <div className='relative z-10 mx-auto max-w-7xl'>
            <div className='mx-auto max-w-4xl text-center'>
              <h1 className='text-5xl leading-none font-semibold text-slate-950 sm:text-7xl lg:text-8xl'>
                {PORTAL_BRAND_NAME}
              </h1>
              <p className='mx-auto mt-5 max-w-2xl text-xl leading-8 text-slate-600 sm:text-2xl'>
                {t('AI access, routed with clarity.')}
              </p>
              <div className='mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row'>
                <Button
                  className='group h-11 rounded-lg bg-[#0071e3] px-6 text-sm font-medium text-white hover:bg-[#0077ed]'
                  render={
                    <Link to={isAuthenticated ? '/console' : '/sign-up'} />
                  }
                >
                  {t('Start building')}
                  <ArrowIcon />
                </Button>
                <Button
                  variant='outline'
                  className='group h-11 rounded-lg border-slate-300 bg-white px-6 text-sm font-medium text-slate-900 hover:bg-slate-50'
                  render={<Link to='/pricing' />}
                >
                  {t('Explore pricing')}
                  <ArrowIcon />
                </Button>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className='px-4 sm:px-6'>
          <div className='mx-auto max-w-6xl'>
            <CapabilitySection
              icon={AiCloud01Icon}
              title={t('One gateway for every model')}
              body={t(
                "Access the world's leading models through a single, consistent API. SkyLake AI routes requests intelligently, applies fallback, and keeps billing unified so your team can focus on shipping."
              )}
              link='/models'
            >
              <ModelFlowVisual />
            </CapabilitySection>

            <CapabilitySection
              icon={AnalyticsUpIcon}
              title={t('Observe every request')}
              body={t(
                'Track usage, latency, tokens, and costs from one clean control plane. Drill down to any request and debug with complete context.'
              )}
              link='/console'
              reverse
            >
              <AnalyticsVisual />
            </CapabilitySection>

            <CapabilitySection
              icon={UserGroup02Icon}
              title={t('Designed for teams')}
              body={t(
                'Advanced security, role-based access, environments, and automated key management keep production AI access organized as your business scales.'
              )}
              link='/console'
            >
              <TeamsVisual />
            </CapabilitySection>
          </div>
        </section>

        <section className='px-4 pb-16 sm:px-6 md:pb-24'>
          <AnimateInView
            as='section'
            animation='scale-in'
            className='relative mx-auto max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-[#f7fbff] px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:px-10'
          >
            <div
              aria-hidden='true'
              className='absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(120deg,transparent_0%,rgba(10,132,255,0.08)_100%)]'
            />
            <div className='relative z-10'>
              <h2 className='text-3xl leading-tight font-semibold text-slate-950 sm:text-4xl'>
                {t('Ready to build with clarity?')}
              </h2>
              <p className='mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600'>
                {t(
                  'Join teams routing faster, safer AI products through SkyLake AI.'
                )}
              </p>
              <div className='mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row'>
                <Button
                  className='group h-11 rounded-lg bg-[#0071e3] px-6 text-sm font-medium text-white hover:bg-[#0077ed]'
                  render={
                    <Link to={isAuthenticated ? '/console' : '/sign-up'} />
                  }
                >
                  {t('Start building')}
                  <ArrowIcon />
                </Button>
                <Button
                  variant='outline'
                  className='group h-11 rounded-lg border-slate-300 bg-white px-6 text-sm font-medium text-slate-900 hover:bg-slate-50'
                  render={<Link to='/pricing' />}
                >
                  {t('Explore pricing')}
                  <ArrowIcon />
                </Button>
              </div>
            </div>
          </AnimateInView>
        </section>
      </main>
      <Footer showLegalLinks={false} />
    </PortalShell>
  )
}
