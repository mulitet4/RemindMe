import { useEffect } from "react";
import { Stack, SplashScreen } from "expo-router";
import { useFonts } from "expo-font";
import "expo-dev-client";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function () {
  const [fontsLoaded, fontError] = useFonts({
    Archivo: require("../assets/fonts/Archivo.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{ headerShown: false, title: "Dashboard" }}
      />
    </Stack>
  );
}
