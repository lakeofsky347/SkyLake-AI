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
import { type SVGProps, useId } from 'react'
import { cn } from '@/lib/utils'

export const PORTAL_BRAND_NAME = 'SkyLake AI'

const SKYLAKE_LOGO_SVG = `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
  <defs>
    <linearGradient id="orbit" x1="13" y1="17" x2="53" y2="29" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22D3EE"/>
      <stop offset="0.52" stop-color="#2D8CFF"/>
      <stop offset="1" stop-color="#A855F7"/>
    </linearGradient>
    <linearGradient id="lake" x1="18" y1="42" x2="47" y2="54" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22D3EE"/>
      <stop offset="0.55" stop-color="#2563EB"/>
      <stop offset="1" stop-color="#8B5CF6"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 31) rotate(90) scale(30)">
      <stop offset="0.08" stop-color="#0F4DCE" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#06163F"/>
    </radialGradient>
    <linearGradient id="planet" x1="45" y1="14" x2="54" y2="23" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22D3EE"/>
      <stop offset="1" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="#04112E"/>
  <circle cx="32" cy="30.5" r="23.5" fill="url(#glow)"/>
  <path d="M13 17.8C23.4 10.2 39.2 8.4 50.7 15.7" stroke="url(#orbit)" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="50.5" cy="16.8" r="4" fill="url(#planet)"/>
  <path d="M31.8 14.6C32.4 17.8 32.4 17.8 35.6 18.4C32.4 19 32.4 19 31.8 22.2C31.2 19 31.2 19 28 18.4C31.2 17.8 31.2 17.8 31.8 14.6Z" fill="white"/>
  <circle cx="22.5" cy="18.2" r="1.2" fill="#56C8FF"/>
  <circle cx="39.2" cy="20.4" r="1.3" fill="#D7DBFF"/>
  <circle cx="18.3" cy="28.7" r="1" fill="#6DA3FF"/>
  <circle cx="42.6" cy="28.3" r="1.1" fill="#8B5CF6"/>
  <path d="M8 37.2C14.5 39.1 20.6 38.9 26 35.9C30 33.7 34.8 33.7 38.9 35.8C44.1 38.6 50.2 38.9 56 37.3" stroke="white" stroke-width="3" stroke-linecap="round"/>
  <path d="M18.3 42.3C26.8 44.9 37.1 44.9 45.7 42.3C38.8 46.1 25.2 46.1 18.3 42.3Z" fill="url(#lake)"/>
  <path d="M21.2 47.3C27.5 48.9 36.4 48.9 42.7 47.3C36.7 50.2 27.2 50.2 21.2 47.3Z" fill="url(#lake)" opacity="0.92"/>
  <path d="M25.4 52C29.1 53 34.7 53 38.5 52C34.8 54 29.1 54 25.4 52Z" fill="url(#lake)" opacity="0.88"/>
</svg>
`.trim()

export const SKYLAKE_BRAND_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  SKYLAKE_LOGO_SVG
)}`

export function SkyLakeBrandMark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  const id = useId().replace(/:/g, '')
  const orbitId = `${id}-orbit`
  const lakeId = `${id}-lake`
  const glowId = `${id}-glow`
  const planetId = `${id}-planet`

  return (
    <svg
      viewBox='0 0 64 64'
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      className={cn('size-8', className)}
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    >
      <defs>
        <linearGradient
          id={orbitId}
          x1='13'
          y1='17'
          x2='53'
          y2='29'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#22D3EE' />
          <stop offset='0.52' stopColor='#2D8CFF' />
          <stop offset='1' stopColor='#A855F7' />
        </linearGradient>
        <linearGradient
          id={lakeId}
          x1='18'
          y1='42'
          x2='47'
          y2='54'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#22D3EE' />
          <stop offset='0.55' stopColor='#2563EB' />
          <stop offset='1' stopColor='#8B5CF6' />
        </linearGradient>
        <radialGradient
          id={glowId}
          cx='0'
          cy='0'
          r='1'
          gradientUnits='userSpaceOnUse'
          gradientTransform='translate(32 31) rotate(90) scale(30)'
        >
          <stop offset='0.08' stopColor='#0F4DCE' stopOpacity='0.9' />
          <stop offset='1' stopColor='#06163F' />
        </radialGradient>
        <linearGradient
          id={planetId}
          x1='45'
          y1='14'
          x2='54'
          y2='23'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#22D3EE' />
          <stop offset='1' stopColor='#8B5CF6' />
        </linearGradient>
      </defs>
      <circle cx='32' cy='32' r='30' fill='#04112E' />
      <circle cx='32' cy='30.5' r='23.5' fill={`url(#${glowId})`} />
      <path
        d='M13 17.8C23.4 10.2 39.2 8.4 50.7 15.7'
        stroke={`url(#${orbitId})`}
        strokeWidth='3.5'
        strokeLinecap='round'
      />
      <circle cx='50.5' cy='16.8' r='4' fill={`url(#${planetId})`} />
      <path
        d='M31.8 14.6C32.4 17.8 32.4 17.8 35.6 18.4C32.4 19 32.4 19 31.8 22.2C31.2 19 31.2 19 28 18.4C31.2 17.8 31.2 17.8 31.8 14.6Z'
        fill='white'
      />
      <circle cx='22.5' cy='18.2' r='1.2' fill='#56C8FF' />
      <circle cx='39.2' cy='20.4' r='1.3' fill='#D7DBFF' />
      <circle cx='18.3' cy='28.7' r='1' fill='#6DA3FF' />
      <circle cx='42.6' cy='28.3' r='1.1' fill='#8B5CF6' />
      <path
        d='M8 37.2C14.5 39.1 20.6 38.9 26 35.9C30 33.7 34.8 33.7 38.9 35.8C44.1 38.6 50.2 38.9 56 37.3'
        stroke='white'
        strokeWidth='3'
        strokeLinecap='round'
      />
      <path
        d='M18.3 42.3C26.8 44.9 37.1 44.9 45.7 42.3C38.8 46.1 25.2 46.1 18.3 42.3Z'
        fill={`url(#${lakeId})`}
      />
      <path
        d='M21.2 47.3C27.5 48.9 36.4 48.9 42.7 47.3C36.7 50.2 27.2 50.2 21.2 47.3Z'
        fill={`url(#${lakeId})`}
        opacity='0.92'
      />
      <path
        d='M25.4 52C29.1 53 34.7 53 38.5 52C34.8 54 29.1 54 25.4 52Z'
        fill={`url(#${lakeId})`}
        opacity='0.88'
      />
    </svg>
  )
}
