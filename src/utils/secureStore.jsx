import * as SecureStore from 'expo-secure-store';

export async function save(key, value) {
  await SecureStore.setItemAsync(key, value);
}

export async function remove(key) {
  await SecureStore.deleteItemAsync(key);
}

export async function getValueFor(key) {
  let result = await SecureStore.getItemAsync(key);
  return result ? result : null;
}
