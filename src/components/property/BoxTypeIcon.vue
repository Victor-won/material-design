<script setup lang="ts">
import type { BoxType } from '@/core/types'

defineProps<{ type: BoxType; active?: boolean }>()
</script>

<template>
  <svg class="box-type-icon" viewBox="0 0 76 60" fill="none" aria-hidden="true">
    <template v-if="type === 'tuck'">
      <path d="M16 20h44v28H16z" :stroke="active ? '#ff4d1f' : 'currentColor'" stroke-width="1.2" />
      <path d="M8 23h8v22H8zM60 23h8v22h-8z" :stroke="active ? '#ff4d1f' : 'currentColor'" stroke-width="1.2" />
      <path d="M16 20V12h44v8M16 48v7h44v-7" :stroke="active ? '#ff4d1f' : 'currentColor'" stroke-width="1.2" />
      <path d="M30 20v28M46 20v28" stroke="currentColor" stroke-dasharray="2 2" opacity=".5" />
    </template>
    <template v-else-if="type === 'mailer'">
      <path d="M16 28h44v22H16z" :stroke="active ? '#ff4d1f' : 'currentColor'" stroke-width="1.2" />
      <path d="M9 31h7v16H9zM60 31h7v16h-7z" :stroke="active ? '#ff4d1f' : 'currentColor'" stroke-width="1.2" />
      <path d="M16 28V13h44v15" :stroke="active ? '#ff4d1f' : 'currentColor'" stroke-width="1.2" />
      <path d="M16 13h44M16 28h44" stroke="currentColor" stroke-dasharray="2 2" opacity=".5" />
    </template>
    <template v-else>
      <path d="M15 29h28v20H15zM56 9h25v15H56z" :stroke="active ? '#ff4d1f' : 'currentColor'" stroke-width="1.2" />
      <path d="M8 32h7v14H8zM43 32h7v14h-7zM15 22h28v7H15zM15 49h28v7H15z" :stroke="active ? '#ff4d1f' : 'currentColor'" stroke-width="1.2" />
      <path d="M50 13h7v7h-7zM79 13h7v7h-7z" :stroke="active ? '#ff4d1f' : 'currentColor'" stroke-width="1.2" />
      <path d="M15 29v20M43 29v20M56 9v15M81 9v15" stroke="currentColor" stroke-dasharray="2 2" opacity=".5" />
    </template>
    <circle cx="66" cy="48" r="2" :fill="active ? '#ff4d1f' : 'currentColor'" opacity=".55" />
    <path d="M69 48h4" stroke="currentColor" stroke-width=".6" opacity=".35" />
  </svg>
</template>

<style scoped>
.box-type-icon {
  width: 100%;
  height: 100%;
  color: #6f685b;
}
</style>
