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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Skeleton } from '@/components/ui/skeleton'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  return (
    <div className='relative grid min-h-svh max-w-none overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_42%,#f5f5f7_100%)]'>
      <Link
        to='/'
        className='absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200/70 backdrop-blur transition-opacity hover:opacity-80 sm:top-8 sm:left-8'
      >
        <div className='relative size-7'>
          {loading ? (
            <Skeleton className='absolute inset-0 rounded-lg' />
          ) : (
            <img
              src={logo}
              alt={t('Logo')}
              className='size-7 rounded-lg object-cover'
            />
          )}
        </div>
        {loading ? (
          <Skeleton className='h-5 w-24' />
        ) : (
          <h1 className='text-sm font-semibold tracking-tight'>{systemName}</h1>
        )}
      </Link>
      <div className='container flex items-center pt-16 sm:pt-0'>
        <div className='relative group mx-auto w-full sm:w-[480px]'>
          <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200'></div>
          <div className='relative flex flex-col justify-center rounded-2xl border border-slate-200 bg-white/92 px-5 py-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md sm:p-8'>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
