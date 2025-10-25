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

# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

# Expo
-keep class expo.modules.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Socket.io
-keep class io.socket.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Kotlin
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }

# Add any project specific keep options here:
