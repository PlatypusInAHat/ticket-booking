$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$JdkHome = Get-ChildItem -Path (Join-Path $ProjectRoot '.jdk') -Directory -Filter 'jdk-17*' |
  Sort-Object Name -Descending |
  Select-Object -First 1

if (-not $JdkHome) {
  throw "Khong tim thay JDK 17 trong mobile/.jdk. Hay tai Temurin JDK 17 truoc khi build Android."
}

$env:JAVA_HOME = $JdkHome.FullName
$env:Path = (Join-Path $env:JAVA_HOME 'bin') + [System.IO.Path]::PathSeparator + $env:Path

$LocalProperties = Join-Path $ProjectRoot 'android/local.properties'
if (Test-Path $LocalProperties) {
  $SdkDirLine = Get-Content -Path $LocalProperties |
    Where-Object { $_ -match '^\s*sdk\.dir\s*=' } |
    Select-Object -First 1

  if ($SdkDirLine) {
    $SdkDir = ($SdkDirLine -replace '^\s*sdk\.dir\s*=\s*', '').Trim()
    if (Test-Path $SdkDir) {
      $env:ANDROID_HOME = $SdkDir
      $env:ANDROID_SDK_ROOT = $SdkDir

      $PlatformTools = Join-Path $SdkDir 'platform-tools'
      if (Test-Path $PlatformTools) {
        $env:Path = $PlatformTools + [System.IO.Path]::PathSeparator + $env:Path
      }
    }
  }
}

Write-Host "JAVA_HOME=$env:JAVA_HOME"
if ($env:ANDROID_HOME) {
  Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
}
