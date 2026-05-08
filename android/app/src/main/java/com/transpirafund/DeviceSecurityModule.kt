package com.transpirafund

import android.app.KeyguardManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceSecurityModule(reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "DeviceSecurity"

  // KeyguardManager.isDeviceSecure returns true iff the user has set up a
  // PIN, pattern, password, or biometric. Fail-open on unexpected platform
  // errors so a broken native dependency never permanently blocks the app.
  @ReactMethod
  fun isDeviceSecure(promise: Promise) {
    try {
      val km = reactApplicationContext.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      promise.resolve(km.isDeviceSecure)
    } catch (e: Exception) {
      promise.resolve(true)
    }
  }
}
