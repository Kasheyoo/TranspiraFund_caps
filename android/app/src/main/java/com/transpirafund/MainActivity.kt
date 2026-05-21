package com.transpirafund

import android.graphics.Color
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "TranspiraFund"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.decorView.setBackgroundColor(Color.parseColor("#0F766E"))
    window.statusBarColor = Color.parseColor("#0F766E")
    window.navigationBarColor = Color.parseColor("#0F766E")
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun createRootView(): ReactRootView {
          val rootView = ReactRootView(this@MainActivity)
          rootView.setBackgroundColor(Color.parseColor("#0F766E"))
          return rootView
        }
      }
}
