const fs = require('fs')
const path = require('path')

// Patch 1: expo-modules-core - guard components.release with findByName
const expoPluginPath = path.join(__dirname, '../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle')
if (fs.existsSync(expoPluginPath)) {
  let content = fs.readFileSync(expoPluginPath, 'utf8')
  if (content.includes('from components.release') && !content.includes('findByName')) {
    content = content.replace(
      `  project.afterEvaluate {
    publishing {
      publications {
        release(MavenPublication) {
          from components.release
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }`,
      `  project.afterEvaluate {
    def releaseComponent = project.components.findByName('release')
    if (releaseComponent != null) {
      publishing {
        publications {
          release(MavenPublication) {
            from releaseComponent
          }
        }
        repositories {
          maven {
            url = mavenLocal().url
          }
        }
      }
    }
  }`
    )
    fs.writeFileSync(expoPluginPath, content, 'utf8')
    console.log('[patch-gradle] Patched ExpoModulesCorePlugin.gradle')
  }
}

// Patch 2: expo-print — add useDefaultAndroidSdkVersions() in the new config path
const expoPrintPath = path.join(__dirname, '../node_modules/expo-print/android/build.gradle')
if (fs.existsSync(expoPrintPath)) {
  let content = fs.readFileSync(expoPrintPath, 'utf8')

  // Fix missing compileSdkVersion when expoProvidesDefaultConfig=true
  if (content.includes('useExpoPublishing()') && !content.includes('useDefaultAndroidSdkVersions()')) {
    content = content.replace(
      /if\s*\(safeExtGet\("expoProvidesDefaultConfig",\s*false\)\)\s*\{[\s\S]*?useExpoPublishing\(\)[\s\S]*?useCoreDependencies\(\)[\s\S]*?\}/,
      `if (safeExtGet("expoProvidesDefaultConfig", false)) {
    useDefaultAndroidSdkVersions()
    useExpoPublishing()
    useCoreDependencies()
  }`
    )
    fs.writeFileSync(expoPrintPath, content, 'utf8')
    console.log('[patch-gradle] Patched expo-print build.gradle — added useDefaultAndroidSdkVersions()')
  }

  // Fix components.release (old path, AGP 8.x compat)
  content = fs.readFileSync(expoPrintPath, 'utf8')
  if (content.includes('from components.release') && !content.includes('findByName')) {
    content = content.replace(
      /afterEvaluate\s*\{([\s\S]*?)from components\.release([\s\S]*?)\}\s*\}\s*\}\s*\}/,
      `afterEvaluate {
    publishing {
      publications {
        def releaseComponent = components.findByName('release')
        if (releaseComponent != null) {
          release(MavenPublication) {
            from releaseComponent
          }
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }`
    )
    fs.writeFileSync(expoPrintPath, content, 'utf8')
    console.log('[patch-gradle] Patched expo-print build.gradle — fixed components.release')
  }
}
