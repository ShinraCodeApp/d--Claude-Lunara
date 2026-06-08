/**
 * Config plugin que agrega el widget de Lunara al manifest de Android.
 * El widget muestra: fase del ciclo, día actual y próximo período.
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

const WIDGET_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:padding="12dp">

    <TextView
        android:id="@+id/widget_app_name"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="🌙 Lunara"
        android:textColor="#C4B5FD"
        android:textSize="10sp"
        android:layout_alignParentTop="true"
        android:layout_alignParentStart="true" />

    <TextView
        android:id="@+id/widget_phase_emoji"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="🌙"
        android:textSize="28sp"
        android:layout_centerHorizontal="true"
        android:layout_below="@id/widget_app_name"
        android:layout_marginTop="4dp" />

    <TextView
        android:id="@+id/widget_phase_name"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Fase lútea"
        android:textColor="#E9D5FF"
        android:textSize="11sp"
        android:textStyle="bold"
        android:layout_below="@id/widget_phase_emoji"
        android:layout_centerHorizontal="true"
        android:layout_marginTop="4dp" />

    <TextView
        android:id="@+id/widget_day"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Día 14"
        android:textColor="#A855F7"
        android:textSize="10sp"
        android:layout_below="@id/widget_phase_name"
        android:layout_centerHorizontal="true" />

    <TextView
        android:id="@+id/widget_next_period"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Próximo período: 14 días"
        android:textColor="#9CA3AF"
        android:textSize="9sp"
        android:layout_alignParentBottom="true"
        android:layout_centerHorizontal="true" />

</RelativeLayout>`

const WIDGET_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="160dp"
    android:minHeight="160dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/lunara_widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_description" />
`

const WIDGET_BACKGROUND = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#CC1A0533" />
    <corners android:radius="16dp" />
    <stroke android:width="1dp" android:color="#3D1A6B" />
</shape>`

const WIDGET_PROVIDER_KT = `package com.shinracode.lunara.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
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
                if (daysUntilPeriod > 0) "Próximo período: $daysUntilPeriod días" else "Período activo 🩸"
            )

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
`

module.exports = function withAndroidWidget(config) {
  // 1. Add receiver to AndroidManifest
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0]
    if (!app.receiver) app.receiver = []

    const hasWidget = app.receiver.some(
      (r) => r.$?.['android:name']?.includes('LunaraWidgetProvider')
    )
    if (!hasWidget) {
      app.receiver.push({
        $: {
          'android:name': '.widget.LunaraWidgetProvider',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/lunara_widget_info',
            },
          },
        ],
      })
    }
    return cfg
  })

  // 2. Write native files
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot
      const androidRoot = path.join(projectRoot, 'android', 'app', 'src', 'main')

      const resLayout = path.join(androidRoot, 'res', 'layout')
      const resXml = path.join(androidRoot, 'res', 'xml')
      const resDrawable = path.join(androidRoot, 'res', 'drawable')
      const widgetPkg = path.join(androidRoot, 'java', 'com', 'shinracode', 'lunara', 'widget')

      for (const dir of [resLayout, resXml, resDrawable, widgetPkg]) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(path.join(resLayout, 'lunara_widget_layout.xml'), WIDGET_LAYOUT)
      fs.writeFileSync(path.join(resXml, 'lunara_widget_info.xml'), WIDGET_INFO)
      fs.writeFileSync(path.join(resDrawable, 'widget_background.xml'), WIDGET_BACKGROUND)
      fs.writeFileSync(path.join(widgetPkg, 'LunaraWidgetProvider.kt'), WIDGET_PROVIDER_KT)

      return cfg
    },
  ])

  return config
}
