# ───────────────────────────────────────────────────────────────────
# General attributes — needed for stacktrace + reflection-driven libs
# ───────────────────────────────────────────────────────────────────
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes Exceptions

# Drop verbose log calls in release.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# ───────────────────────────────────────────────────────────────────
# React Native core / Hermes / JNI
# ───────────────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.proguard.annotations.DoNotStrip { *; }
-keep class com.facebook.proguard.annotations.KeepGettersAndSetters { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep @com.facebook.proguard.annotations.KeepGettersAndSetters class * { *; }
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.proguard.annotations.KeepGettersAndSetters *;
}
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp *;
    @com.facebook.react.uimanager.annotations.ReactPropGroup *;
}
-keep class com.facebook.react.turbomodule.** { *; }
-dontwarn com.facebook.react.**

# ───────────────────────────────────────────────────────────────────
# Firebase (Auth / Firestore / Storage / Functions)
# ───────────────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firestore's RPC channel — Firestore re-marshals every doc payload through
# gRPC + protobuf reflection. Without these keep rules, R8 renames internal
# message classes and Firestore RPCs throw at runtime in release builds.
-keep class io.grpc.** { *; }
-keep interface io.grpc.** { *; }
-keep class com.google.protobuf.** { *; }
-keep interface com.google.protobuf.** { *; }
-dontwarn io.grpc.**
-dontwarn com.google.protobuf.**

# ───────────────────────────────────────────────────────────────────
# Reanimated v4 + Worklets
# ───────────────────────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.react.turbomodule.core.** { *; }
-dontwarn com.swmansion.reanimated.**
-dontwarn com.swmansion.worklets.**

# ───────────────────────────────────────────────────────────────────
# Gesture handler / Screens / Safe Area Context
# ───────────────────────────────────────────────────────────────────
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.swmansion.gesturehandler.**
-dontwarn com.swmansion.rnscreens.**
-dontwarn com.th3rdwave.safeareacontext.**

# ───────────────────────────────────────────────────────────────────
# Vector icons
# ───────────────────────────────────────────────────────────────────
-keep class com.oblador.vectoricons.** { *; }

# ───────────────────────────────────────────────────────────────────
# Image picker (camera capture)
# ───────────────────────────────────────────────────────────────────
-keep class com.imagepicker.** { *; }

# ───────────────────────────────────────────────────────────────────
# Geolocation service
# ───────────────────────────────────────────────────────────────────
-keep class com.agontuk.RNFusedLocation.** { *; }
-dontwarn com.agontuk.RNFusedLocation.**

# ───────────────────────────────────────────────────────────────────
# Async Storage
# ───────────────────────────────────────────────────────────────────
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ───────────────────────────────────────────────────────────────────
# react-native-pdf (uses AndroidPdfViewer + react-native-blob-util)
# ───────────────────────────────────────────────────────────────────
-keep class com.github.barteksc.pdfviewer.** { *; }
-keepclassmembers class com.github.barteksc.pdfviewer.** { *; }
-keep class com.shockwave.** { *; }
-dontwarn com.shockwave.**

-keep class com.rnfetchblob.** { *; }
-keepclassmembers class com.rnfetchblob.** { *; }
-keep class com.ReactNativeBlobUtil.** { *; }
-keepclassmembers class com.ReactNativeBlobUtil.** { *; }

# ───────────────────────────────────────────────────────────────────
# get-random-values (uses java.security.SecureRandom — no rules
# needed beyond keeping its module class which is covered by RN core)
# ───────────────────────────────────────────────────────────────────

# ───────────────────────────────────────────────────────────────────
# Native modules in this app (DeviceSecurity ships in Phase 3)
# ───────────────────────────────────────────────────────────────────
-keep class com.transpirafund.** { *; }

# ───────────────────────────────────────────────────────────────────
# OkHttp / Okio (RN networking)
# ───────────────────────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }
-keep interface okio.** { *; }

# ───────────────────────────────────────────────────────────────────
# Kotlin metadata + coroutines
# ───────────────────────────────────────────────────────────────────
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.coroutines.**
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# ───────────────────────────────────────────────────────────────────
# JS-bound enums (read by reflection from the bridge)
# ───────────────────────────────────────────────────────────────────
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ───────────────────────────────────────────────────────────────────
# R8 compatibility
# ───────────────────────────────────────────────────────────────────
# Note: -allowaccessmodification and -repackageclasses '' were intentionally
# left out. Both repackage classes that aren't explicitly -kept, which breaks
# Firebase Firestore's gRPC channel and any other library that resolves
# classes by canonical name at runtime.
