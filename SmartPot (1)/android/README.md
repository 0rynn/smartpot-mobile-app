# SmartPot — Android Emulator Package

A native Android app that runs the SmartPot interface full-screen on an
emulator (or a real phone). It is a thin WebView shell: the entire SmartPot app
(live Firebase dashboard, Plant Health Scan with the bundled
`smartpot_plant_model.tflite`, History charts, Settings) ships inside the APK
under `app/src/main/assets/` and renders **full-bleed** — no simulated bezel,
since it's running on a real device frame.

## Run it (Android Studio — recommended)

1. **Open** Android Studio → *Open* → select this `android/` folder.
2. Let Gradle sync (first sync downloads Gradle 8.7 + dependencies automatically).
3. Create/start an emulator: *Device Manager → Create Device* (e.g. Pixel 8, API 34).
4. Press **Run ▶**. The SmartPot app installs and launches.

> Requires Android Studio (Hedgehog or newer). Min SDK 26 (Android 8.0).

## Run it (command line)

```bash
cd android
gradle wrapper          # one-time, generates ./gradlew
./gradlew installDebug  # with an emulator running
adb shell am start -n com.smartpot.app/.MainActivity
```

## What to expect

- **Internet required** — the app talks to your Firebase Realtime Database and
  loads React/Babel/MediaPipe from CDNs. Emulators have internet by default.
- **Live vs Offline chip** — green "Live" when the ESP32 is reporting to
  `smartpot/latest`; red "Device offline" if no reading arrives (device down,
  no Wi-Fi, or DB rules blocking reads). There is **no simulated data** — the UI
  shows only real readings from your hardware.
- **Pump control** — the pump defaults to **Manual**. Tapping **Water** (or
  switching Auto/Manual in Settings) writes to `smartpot/control`, which the
  ESP32 listens to and uses to drive the relay:

  ```
  smartpot/control = {
    pump: "ON" | "OFF",       // manual water command
    duration_s: 8,            // how long to run the pump
    mode: "manual" | "auto",  // self-watering on the device or app-driven
    requested_at: <ms>,       // command timestamp
    source: "android-app"
  }
  ```

  Your firmware should subscribe to `smartpot/control`, run the pump relay when
  `pump == "ON"` (for `duration_s`, or until it sees `"OFF"`), and report the
  real relay state back in `smartpot/latest.pump_status`.
- **Scan tab** — "Scan Plant" / "Choose from gallery" opens the Android photo
  picker (wired through the WebView file-chooser). Results are written to
  `smartpot/readings`. Drag a leaf photo onto the emulator window to drop it
  into its gallery first.
- **Model** — `smartpot_plant_model.tflite` is bundled and served to the
  in-app MediaPipe runtime. Until the model file carries embedded
  NormalizationOptions metadata it falls back to the preview classifier — see
  `../ENABLE_REAL_MODEL.md` for the 10-line Python fix.

## Project layout

```
android/
├── settings.gradle / build.gradle / gradle.properties
├── gradle/wrapper/gradle-wrapper.properties
└── app/
    ├── build.gradle                  # androidx.webkit only — no other deps
    └── src/main/
        ├── AndroidManifest.xml       # INTERNET permission, single activity
        ├── java/com/smartpot/app/MainActivity.java
        │     # WebViewAssetLoader (real https origin), file-chooser bridge,
        │     # brand-green status bar, back-button handling
        ├── res/mipmap-*/ic_launcher.png
        └── assets/                   # the SmartPot web app + .tflite model
```

## Customizing

- **App id / name**: `app/build.gradle` (`applicationId`) and
  `res/values/strings.xml` (`app_name`).
- **Class order for the model**: `assets/tflite.jsx` → `TFLITE_CLASSES`.
- **Firebase target**: `assets/data.jsx` → `SP_FIREBASE`.
