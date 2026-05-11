-keepattributes Signature
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes Exceptions

-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

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

-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

-keep class io.grpc.** { *; }
-keep interface io.grpc.** { *; }
-keep class com.google.protobuf.** { *; }
-keep interface com.google.protobuf.** { *; }
-dontwarn io.grpc.**
-dontwarn com.google.protobuf.**

-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.react.turbomodule.core.** { *; }
-dontwarn com.swmansion.reanimated.**
-dontwarn com.swmansion.worklets.**

-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keepclassmembers class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.swmansion.gesturehandler.**
-dontwarn com.swmansion.rnscreens.**
-dontwarn com.th3rdwave.safeareacontext.**

-keep class * extends androidx.fragment.app.Fragment { *; }
-keep class androidx.fragment.app.** { *; }
-keep class androidx.lifecycle.** { *; }
-dontwarn androidx.fragment.app.**
-dontwarn androidx.lifecycle.**

-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.imageutils.** { *; }
-keep class com.facebook.drawee.** { *; }
-keep class com.facebook.common.** { *; }
-dontwarn com.facebook.imagepipeline.**
-dontwarn com.facebook.drawee.**

-keep class com.oblador.vectoricons.** { *; }

-keep class com.imagepicker.** { *; }

-keep class com.agontuk.RNFusedLocation.** { *; }
-dontwarn com.agontuk.RNFusedLocation.**

-keep class com.reactnativecommunity.asyncstorage.** { *; }

-keep class org.wonday.pdf.** { *; }
-keep class org.wonday.pdf.events.** { *; }
-dontwarn org.wonday.pdf.**

-keep class com.github.barteksc.pdfviewer.** { *; }
-keepclassmembers class com.github.barteksc.pdfviewer.** { *; }
-keep class com.shockwave.** { *; }
-dontwarn com.shockwave.**

-keep class com.rnfetchblob.** { *; }
-keepclassmembers class com.rnfetchblob.** { *; }
-keep class com.ReactNativeBlobUtil.** { *; }
-keepclassmembers class com.ReactNativeBlobUtil.** { *; }

-keep class org.linusu.** { *; }
-dontwarn org.linusu.**

-keep class com.transpirafund.** { *; }

-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }
-keep interface okio.** { *; }

-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.coroutines.**
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
