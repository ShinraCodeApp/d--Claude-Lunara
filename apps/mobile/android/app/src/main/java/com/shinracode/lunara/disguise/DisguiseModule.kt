package com.shinracode.lunara.disguise

import android.content.ComponentName
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DisguiseModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "LunaraDisguise"

    companion object {
        // All alias names (must match AndroidManifest.xml exactly)
        private val ALL_ALIASES = listOf(
            "MainActivityLunara",
            "MainActivityCalculadora",
            "MainActivityNotas",
            "MainActivityClima",
        )
    }

    @ReactMethod
    fun setDisguise(aliasName: String, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val pkg = reactContext.packageName

            ALL_ALIASES.forEach { alias ->
                val component = ComponentName(pkg, "$pkg.$alias")
                val state = if (alias == aliasName)
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                else
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                pm.setComponentEnabledSetting(component, state, PackageManager.DONT_KILL_APP)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISGUISE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getActiveAlias(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val pkg = reactContext.packageName

            val active = ALL_ALIASES.firstOrNull { alias ->
                val component = ComponentName(pkg, "$pkg.$alias")
                pm.getComponentEnabledSetting(component) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            } ?: "MainActivityLunara"

            promise.resolve(active)
        } catch (e: Exception) {
            promise.resolve("MainActivityLunara")
        }
    }
}
