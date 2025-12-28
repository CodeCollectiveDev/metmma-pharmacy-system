<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold">Home Page</h1>
     <BaseButton>Click Me</BaseButton>
    <BaseInput placeholder="Type something..." />
    <BaseCard>
      <p>This is a card content</p>
    </BaseCard>
  </div>
</template>

<script setup>
import BaseButton from '@/modules/shared/components/BaseButton.vue'
import BaseInput from '@/modules/shared/components/BaseInput.vue'
import BaseCard from '@/modules/shared/components/BaseCard.vue'
</script>