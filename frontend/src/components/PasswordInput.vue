<script setup>
import { ref, useId } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

const model = defineModel({ type: String, default: '' })
const props = defineProps({
  label: { type: String, default: '' },
  labelClass: { type: String, default: 'block' },
  inputClass: { type: String, default: 'field' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  required: { type: Boolean, default: false },
  minlength: { type: [Number, String], default: undefined },
  maxlength: { type: [Number, String], default: undefined },
  inputId: { type: String, default: '' }
})
const fallbackId = useId()
const inputId = props.inputId || fallbackId
const visible = ref(false)
</script>

<template>
  <div>
    <label v-if="label" :for="inputId" :class="labelClass">{{ label }}</label>
    <span class="relative block">
      <input
        :id="inputId"
        v-model="model"
        :type="visible ? 'text' : 'password'"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :minlength="minlength"
        :maxlength="maxlength"
        :class="[inputClass, 'pr-10']"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-800"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        :title="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      >
        <EyeOff v-if="visible" class="w-4 h-4" aria-hidden="true" />
        <Eye v-else class="w-4 h-4" aria-hidden="true" />
      </button>
    </span>
  </div>
</template>
