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
