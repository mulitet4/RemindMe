- Always use **npm** exclusively for dependencies, development, and builds; never mix with Yarn or pnpm.
- Follow **Expo** conventions for configuration, building, and routing. Prefer official Expo SDK modules first before third-party ones.
- Use **NativeWind v3** for styling. Stick to **default Tailwind/NativeWind utilities and theme tokens** (`text-foreground`, `bg-muted`, etc.), and only add custom tokens if absolutely necessary.
- Store all **assets** (images, fonts, icons, media) inside the `assets/` folder. Import them locally via `require` or `expo-asset`.
- Place all **components** in `src/components/`, one per file, named in **PascalCase** (`UserCard.js`, `LoginForm.js`).
- Place all **logic, utilities, services, and controller-like functions** in `src/utils/` (e.g., API calls, AsyncStorage helpers, formatters, custom hooks). Treat `src/utils/` as the "controller layer."
- Stick to consistent naming conventions:
  - **PascalCase** for components (`UserCard`, `HeaderBar`)
  - **camelCase** for helpers (`fetchUserData`)
  - **lowercase-with-dashes.js** for file names (`login-form.js`)
  - **UPPER_CASE** for environment variables (`EXPO_PUBLIC_API_URL`)
- Do not put **fetching code or AsyncStorage calls directly in components**. Always wrap them inside utilities in `src/utils/`. Example:

```js
// src/utils/user.js
/**
 * Fetch a user profile by ID
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getUserProfile(id) {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/${id}`);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}
```

```js
// src/components/UserProfile.js
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { getUserProfile } from "../utils/user";

export default function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUserProfile("123").then(setUser).catch(console.error);
  }, []);

  return (
    <View className='flex-1 items-center justify-center bg-background'>
      <Text className='text-foreground'>{user ? user.name : "Loading..."}</Text>
    </View>
  );
}
```

- Build everything to be **self-contained**: each component should handle its UI + local state + calls to utilities from `src/utils/`. Avoid over-splitting — keep related logic together.
- Use **React hooks (`useEffect`, `useState`)** for local state and side effects. No Redux, Zustand, or React Query.
- Emphasize **lean fetchers**: just `fetch`, `axios`, or `expo` networking APIs inside `src/utils/`.
- Use **Pressable** components styled with Tailwind for interactions instead of TouchableOpacity unless required.
- Ensure **accessibility** everywhere: add `accessibilityLabel`, roles, and screen-reader-friendly props.
- Use **Expo Router + app/ directory** (preferred) for navigation and routing.
- Document **utils** with JSDoc typedefs for clarity. Components only need minimal inline comments.
- Use **standard Expo libraries** instead of custom hacks:
  - **expo-auth-session** for OAuth/auth flows
  - **expo-secure-store** for secure tokens
  - **expo-camera** for media
  - **expo-location** for geolocation
  - **expo-image-picker** for uploading images
- Always check **reactnative.directory** or official Expo docs before adding dependencies. Do not reinvent solved problems.
- Use **react-native-vector-icons** or **lucide-react-native** for icons. Avoid rolling your own unless truly needed.
- Lint and format code with **ESLint + Prettier** to enforce consistent style.
- Keep secrets in **.env**, load via `expo-constants` or `react-native-dotenv`. Never hardcode API keys.
- Test with **Jest + React Native Testing Library**, focusing on utils and UI integration.
- Run `expo doctor` and `npm audit` regularly to keep dependencies secure.
- Plan for **EAS Build + OTA Updates** for production delivery.
- For AI tools like GitHub Copilot, always provide:
  - Project file structure (`src/components/`, `src/utils/`, `assets/`)
  - Naming + styling conventions (PascalCase, Tailwind only, self-contained components)
  - Reminder not to add state management or unnecessary dependencies
- Review all Copilot/AI-generated code critically for clarity, correctness, and security.
- Maintain `.github/copilot-instructions.md` with these rules so tooling stays aligned.
- **Golden rule**: Always check online documentation or **reactnative.directory** before coding — don’t reinvent something that already has a reliable, maintained solution.
