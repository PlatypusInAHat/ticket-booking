. "$PSScriptRoot\android-env.ps1"

$GradleScript = Join-Path $PSScriptRoot 'gradle.ps1'
& $GradleScript app:installDebug @args
$ExitCode = $LASTEXITCODE

if ($ExitCode -eq 0 -and $env:ANDROID_HOME) {
  $Adb = Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'
  if (Test-Path $Adb) {
    & $Adb shell monkey -p com.ticketbooking.mobile 1 | Out-Null
    Write-Host "Opened com.ticketbooking.mobile on the connected Android device."
  }
}

exit $ExitCode
