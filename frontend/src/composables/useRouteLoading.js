import { ref } from 'vue'

const routeLoading = ref(false)

export function useRouteLoading() {
  return { routeLoading }
}

export function setRouteLoading(value) {
  routeLoading.value = value
}
