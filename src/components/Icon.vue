<template>
  <component
    :is="resolved"
    v-if="resolved"
    :size="size"
    :stroke-width="strokeWidth"
    :class="['lucide-icon', iconClass]"
    :aria-hidden="decorative ? 'true' : null"
    :role="decorative ? null : 'img'"
    :aria-label="decorative ? null : label"
  />
</template>

<script>
import { iconMap } from '../icons.js';

export default {
  name: 'Icon',
  props: {
    name: { type: String, required: true },
    size: { type: [Number, String], default: 18 },
    strokeWidth: { type: [Number, String], default: 2 },
    iconClass: { type: String, default: '' },
    decorative: { type: Boolean, default: true },
    label: { type: String, default: '' },
  },
  computed: {
    resolved() {
      return iconMap[this.name] || null;
    },
  },
};
</script>
