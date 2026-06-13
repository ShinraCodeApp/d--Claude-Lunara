package com.shinracode.lunara.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.shinracode.lunara.MainActivity
import com.shinracode.lunara.R

class LunaraWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, widgetId: Int) {
            val prefs = context.getSharedPreferences("LunaraWidget", Context.MODE_PRIVATE)
            val phase = prefs.getString("phase", "Fase lútea") ?: "Fase lútea"
            val phaseEmoji = prefs.getString("phaseEmoji", "🌙") ?: "🌙"
            val dayOfCycle = prefs.getInt("dayOfCycle", 1)
            val daysUntilPeriod = prefs.getInt("daysUntilPeriod", -1)

            val views = RemoteViews(context.packageName, R.layout.lunara_widget_layout)
            views.setTextViewText(R.id.widget_phase_emoji, phaseEmoji)
            views.setTextViewText(R.id.widget_phase_name, phase)
            views.setTextViewText(R.id.widget_day, "Día $dayOfCycle")
            views.setTextViewText(
                R.id.widget_next_period,
                if (daysUntilPeriod > 0) "Próximo período: $daysUntilPeriod días"
                else if (daysUntilPeriod == 0) "Período mañana 🩸"
                else "Período activo 🩸"
            )

            // Tap opens the app
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
