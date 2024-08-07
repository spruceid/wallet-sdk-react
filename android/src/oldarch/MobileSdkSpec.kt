package com.mobilesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray

abstract class MobileSdkSpec internal constructor(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

    abstract fun createSoftPrivateKeyFromPKCS8PEM(_algo: String, key: String, cert: String, promise: Promise)
    abstract fun createMdocFromCbor(cborMdoc: String, promise: Promise)
    abstract fun createBleManager(promise: Promise)
    abstract fun bleSessionStartPresentMdoc(_bleUuid: String, mdoc: String, privateKey: String, deviceEngagement: String, promise: Promise)
    abstract fun bleSessionSubmitNamespaces(_bleUuid: String, namespaces: ReadableArray,promise: Promise)
    abstract fun bleSessionCancel(_bleUuid: String, promise: Promise)
    abstract fun allCredentials(promise: Promise)
}
