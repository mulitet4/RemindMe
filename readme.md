## Quick Links

- [Expo Community Notes](https://github.com/expo/fyi)
- [Expo Library Reference](https://docs.expo.dev/workflow/using-libraries/)
- [React Native Directory](https://reactnative.directory/)
- [Expo Installable Libraries](https://docs.expo.dev/versions/latest/)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
  [Expo Docs](https://docs.expo.dev/)

## Features

### � Real Alarm System

- **System-Level Alarms**: Uses native Android AlarmManager and iOS alarm capabilities to create real alarms that ring even when the phone is locked
- **Wake-Up Functionality**: Alarms can wake up the device and turn on the screen
- **Multiple Fallbacks**: If system alarms fail, high-priority notifications with continuous ringing ensure you don't miss anything
- **One-Hour Warnings**: Smart notifications sent 1 hour before your scheduled alarms
- **Background Processing**: Uses Expo TaskManager with 1-minute intervals to check and trigger alarms precisely
- **Cross-Platform**: Optimized for both iOS and Android with proper permissions and native alarm scheduling

### 📱 App Features

- Create alarms with specific times or as daily recurring reminders
- Edit and delete existing alarms
- Real-time alarm ringing interface with dismiss/snooze options
- View comprehensive alarm system status (tap the ⚙️ button)
- Intuitive UI with shadow effects and smooth animations
- Haptic feedback during alarm ringing

## Real Alarm Implementation

The app uses a sophisticated real alarm system that:

1. **Native Alarm Libraries**:
   - Universal: Fallback to maximum-priority notifications with continuous ringing

2. **Wake-Up Capabilities**:
   - `WAKE_LOCK` permission keeps device awake
   - `TURN_SCREEN_ON` and `DISABLE_KEYGUARD` turn on screen and bypass lock screen
   - `SCHEDULE_EXACT_ALARM` ensures precise timing on Android 12+

3. **Multi-Layered Alarm System**:
   - **Primary**: System alarms that wake the device and ring like built-in alarms
   - **Secondary**: High-priority notifications with continuous sound
   - **Tertiary**: Repeating notifications every 30 seconds for 5 minutes
   - **Backup**: 1-hour warning notifications

4. **Background Processing**:
   - Background tasks run every minute to check for triggered alarms
   - Persistent storage tracks scheduled and triggered alarms
   - Works whether the app is open, backgrounded, or completely closed

5. **User Experience**:
   - Full-screen alarm ringing interface with animations and haptic feedback
   - Snooze (5 minutes) and dismiss options
   - Visual and audio feedback during alarm events

### Technical Details

- Background tasks check for alarms every minute (more frequent than standard 15-minute minimum)
- System alarms use native device alarm capabilities for maximum reliability
- Persistent alarm storage using AsyncStorage for tracking alarm states
- Comprehensive error handling with automatic fallbacks
- Real-time alarm status monitoring and debugging interface

### Platform-Specific Features

- **Android**: Uses AlarmManager for exact alarm scheduling, supports Android 12+ exact alarm permissions
- **iOS**: Integrates with native alarm clock functionality, uses background processing modes
- **Both**: Haptic feedback, screen wake-up, and lock screen bypass capabilities

## Update Expo

- [reference](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- `npm install expo@latest`
- `npx expo install --fix`
- `npm install -g eas-cli`

## Run

- `npm i`
- `eas build --platform android --profile development` (download the dev build in releases)
- Install on native device
- `npx expo start`
- Connect to the same network or hotspot and scan qr using any app. Paste the link you get with the qr in the development build.

## Generate Dev Build

- delete eas id from [app.json](/app.json)
- generate a [development build](https://docs.expo.dev/develop/development-builds/use-development-builds/) using `eas build --platform android --profile development`
- Run development build by using adb reverse tcp:8081 tcp:8081
- prebuild android & ios using: `npx expo prebuild`, only for niche cases

## Generate Distribution Build

- Get APK build - `eas build --platform android --profile local`
- Get Distribution build using `eas build --platform android --profile production`

## Design System

This repo uses [React Native Paper](https://callstack.github.io/react-native-paper/) as its design system using material design.

- [Adaptive Icon Maker](https://icon.kitchen/i/H4sIAAAAAAAAA02PwQqDMAyG3yW7etlteJUdd1LYYYwRm1SL1bpWp0N896Udg7WQkC%2F5yZ8NXmhnDpBvQOi7quWeIddoA2egm8KaEf0U24ElAbHG2U6QgVFuEIBEj9qtsMfx6j2KGkyPDcuIAF6j6ipF3RTOOi%2FVQaeXWNlikoTnbLyyX9VZa1aTmILQIrklwVKhNUMjUPEwsU%2FwgqH7t%2FvbcKKj%2FGiqdzTbeOANcCDvDEXvLkhcuIb7%2FgGFJHJIAwEAAA%3D%3D)
- [Theme Maker](https://callstack.github.io/react-native-paper/docs/guides/theming/#creating-dynamic-theme-colors): Use this to replace src/constants/Colors.jsx to suit the app theme
- [React Native Paper Components](https://callstack.github.io/react-native-paper/docs/components/ActivityIndicator/)
- React Native Paper uses these [icons](https://static.enapter.com/rn/icons/material-community.html) internally

## Notes

### Expo Dev Builds

- Need to rebuild development builds when using packages with Native code. [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/) uses Native Code (Java/Kotlin for Android & Objective-C/Swift for iOS).
- For External Libraries use npx expo install [package-compatible-with-expo]
- To know if it is a Native Code package on Expo, they usually have android or ios badge to indicate platform dependance. For a third party library, refer to [React Native Directory](https://reactnative.directory/) and check if it has an expo go tag on it. [Expo Library Reference](https://docs.expo.dev/workflow/using-libraries/) has all the questions which if answered yes, would need you to make a new development build.
- If any permission is required, it needs to be changed in app.json -> expo -> plugins. This is termed [Config Plugins](https://docs.expo.dev/config-plugins/introduction/)

### Sharing Dev Builds

For projects with similiar Native Code package dependencies, the custom Dev Build/Client can be used for the projects. Download from the releases section

### Template Dev Build

This dev build uses a bunch of libraries with native code dependancies, can reuse the Template dev client for future projects. Look into package.json for a list of all packages. Refer to Expo and React Native Directory for more info.
