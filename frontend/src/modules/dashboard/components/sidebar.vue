<template>
  <aside
    class="h-screen w-64 bg-blue-900 text-white p-6 flex flex-col fixed left-0 top-0 shadow-lg"
  >
    <h2 class="text-xl font-bold mb-8">
      Pharmacy System
    </h2>

    <nav class="space-y-4">
      <router-link
        to="/"
        class="block px-3 py-2 rounded hover:bg-blue-700"
      >
        Dashboard
      </router-link>

      <router-link
        to="/patients"
        class="block px-3 py-2 rounded hover:bg-blue-700"
      >
        Patients records 
      </router-link>

      <router-link
        to="/drugs"
        class="block px-3 py-2 rounded hover:bg-blue-700"
      >
        inventory 
      </router-link>

      <router-link
        to="/sales"
        class="block px-3 py-2 rounded hover:bg-blue-700"
      >
         point of Sale
      </router-link>

      <router-link
        to="/reports"
        class="block px-3 py-2 rounded hover:bg-blue-700"
      >
        Reports
      </router-link>
    </nav>

    <div class="mt-auto">
      <button class="w-full bg-red-600 py-2 rounded hover:bg-red-700">
        Logout
      </button>
    </div>
  </aside>
</template>
