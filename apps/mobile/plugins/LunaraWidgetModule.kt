package com.shinracode.lunara

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.shinracode.lunara.widget.LunaraWidgetProvider

class LunaraWidgetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LunaraWidgetModule"

    @ReactMethod
    fun updateWidget(data: ReadableMap) {
        val prefs: SharedPreferences = reactContext
            .getSharedPreferences("LunaraWidget", Context.MODE_PRIVATE)
            .edit()
            .apply {
                putString("phase", data.getString("phase"))
                putString("phaseEmoji", data.getString("phaseEmoji"))
                putInt("dayOfCycle", data.getInt("dayOfCycle"))
                putInt("daysUntilPeriod", data.getInt("daysUntilPeriod"))
            }
            .let { it.apply(); reactContext.getSharedPreferences("LunaraWidget", Context.MODE_PRIVATE) }

        val manager = AppWidgetManager.getInstance(reactContext)
        val ids = manager.getAppWidgetIds(
            ComponentName(reactContext, LunaraWidgetProvider::class.java)
        )
        ids.forEach { LunaraWidgetProvider.updateWidget(reactContext, manager, it) }
    }
}
