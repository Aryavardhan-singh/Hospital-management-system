export function useRegisterSW() {
  return {
    offlineReady: [false, () => {}] as [boolean, (val: boolean) => void],
    needRefresh: [false, () => {}] as [boolean, (val: boolean) => void],
    updateServiceWorker: async () => {},
  }
}
