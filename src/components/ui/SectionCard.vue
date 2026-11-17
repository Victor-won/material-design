<script setup lang="ts">
defineProps<{
  index: string
  title: string
  hint?: string
}>()
</script>

<template>
  <section class="section-card">
    <header class="section-head">
      <span class="section-index">{{ index }}</span>
      <div class="section-titles">
        <h3>{{ title }}</h3>
        <p v-if="hint">{{ hint }}</p>
      </div>
      <div class="section-action">
        <slot name="action" />
      </div>
    </header>
    <div class="section-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.section-card {
  padding: 15px 0 17px;
  border-bottom: 1px solid rgba(217, 210, 195, 0.72);
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 13px;
}

.section-index {
  padding-top: 2px;
  color: var(--accent);
  font-family: var(--font-display);
  font-size: 11px;
  font-style: italic;
  line-height: 1;
}

.section-titles {
  min-width: 0;
  flex: 1;
}

.section-titles h3 {
  margin: 0;
  font-size: 11px;
  font-weight: 730;
  letter-spacing: 0.02em;
  line-height: 1.25;
}

.section-titles p {
  margin: 3px 0 0;
  color: var(--muted-2);
  font-size: 8px;
  line-height: 1.4;
}

.section-action {
  flex: 0 0 auto;
}

.section-body {
  min-width: 0;
}
</style>
