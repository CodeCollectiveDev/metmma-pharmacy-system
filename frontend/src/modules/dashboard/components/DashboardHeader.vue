<template>
  <div class="mb-8 flex justify-between items-end border-b border-gray-100 pb-4">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">
        Pharmacy Information System
      </h1>
      <p class="text-gray-500 mt-1">
        Overview of your pharmacy's performance today.
      </p>
    </div>
    <div class="text-sm text-gray-400">
      {{ new Date().toLocaleDateString() }}
    </div>
  </div>
</template>
