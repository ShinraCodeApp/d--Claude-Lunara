package com.shinracode.lunara.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class WidgetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "LunaraWidget"

    @ReactMethod
    fun updateWidgetData(data: ReadableMap) {
        val prefs = reactContext.getSharedPreferences("LunaraWidget", Context.MODE_PRIVATE)
        val editor = prefs.edit()

        if (data.hasKey("phase")) editor.putString("phase", data.getString("phase"))
        if (data.hasKey("phaseEmoji")) editor.putString("phaseEmoji", data.getString("phaseEmoji"))
        if (data.hasKey("dayOfCycle")) editor.putInt("dayOfCycle", data.getInt("dayOfCycle"))
        if (data.hasKey("daysUntilPeriod")) editor.putInt("daysUntilPeriod", data.getInt("daysUntilPeriod"))

        editor.apply()
        refreshWidgets()
    }

    private fun refreshWidgets() {
        val manager = AppWidgetManager.getInstance(reactContext)
        val ids = manager.getAppWidgetIds(
            ComponentName(reactContext, LunaraWidgetProvider::class.java)
        )
        if (ids.isNotEmpty()) {
            for (id in ids) {
                LunaraWidgetProvider.updateWidget(reactContext, manager, id)
            }
        }
    }
}
