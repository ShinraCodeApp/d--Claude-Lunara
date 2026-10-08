# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native / Hermes (las clases nativas se buscan por nombre desde JS)
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod *; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp *; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup *; }

# Expo modules (registro por reflexion)
-keep class expo.modules.** { *; }

# react-native-mmkv (JSI) y SVG
-keep class com.tencent.mmkv.** { *; }
-keep class com.reactnativemmkv.** { *; }
-keep class com.horcrux.svg.** { *; }

# Widget de Lunara y su modulo nativo
-keep class com.shinracode.lunara.widget.** { *; }

# Google Sign-In / Firebase / Sentry traen sus propias reglas; evitar avisos
-dontwarn com.google.android.gms.**
-dontwarn io.sentry.**

# Add any project specific keep options here:
