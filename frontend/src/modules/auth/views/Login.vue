<template>
  <div>
    <h2>Login</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="login">Login</button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const router = useRouter();

function login() {
  const fakeResponse = {
    token: "fake-jwt-token"
  };

  localStorage.setItem("token", fakeResponse.token);

  router.push("/dashboard");
}
</script>
