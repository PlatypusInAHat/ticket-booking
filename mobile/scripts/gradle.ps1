. "$PSScriptRoot\android-env.ps1"

$AndroidRoot = Join-Path $ProjectRoot 'android'
$ProjectCacheDir = Join-Path $ProjectRoot '.gradle-project-cache'
$GradleArgs = @($args)

if ($GradleArgs -notcontains '--project-cache-dir') {
  $GradleArgs += @('--project-cache-dir', $ProjectCacheDir)
}

function Repair-GradleDependencyAccessors {
  param([string] $CacheRoot)

  if (-not (Test-Path $CacheRoot)) {
    return $false
  }

  $Moved = $false
  $AccessorRoots = Get-ChildItem -Path $CacheRoot -Recurse -Directory -Filter 'dependencies-accessors' -ErrorAction SilentlyContinue

  foreach ($AccessorRoot in $AccessorRoots) {
    $TempDirs = Get-ChildItem -Path $AccessorRoot.FullName -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^([0-9a-f]{40})-' }

    $Groups = $TempDirs | Group-Object { [regex]::Match($_.Name, '^([0-9a-f]{40})-').Groups[1].Value }

    foreach ($Group in $Groups) {
      $Destination = Join-Path $AccessorRoot.FullName $Group.Name
      if (Test-Path $Destination) {
        continue
      }

      $Source = $Group.Group | Sort-Object LastWriteTime -Descending | Select-Object -First 1

      try {
        Move-Item -LiteralPath $Source.FullName -Destination $Destination -ErrorAction Stop
        Write-Host "Repaired Gradle accessor cache: $($Group.Name)"
        $Moved = $true
      }
      catch {
        Write-Warning "Could not repair Gradle accessor cache $($Group.Name): $($_.Exception.Message)"
      }
    }
  }

  return $Moved
}

Push-Location $AndroidRoot

try {
  $ExitCode = 1

  for ($Attempt = 1; $Attempt -le 4; $Attempt++) {
    & .\gradlew.bat @GradleArgs
    $ExitCode = $LASTEXITCODE

    if ($ExitCode -eq 0) {
      break
    }

    if ($Attempt -ge 4) {
      break
    }

    $Repaired = Repair-GradleDependencyAccessors -CacheRoot $ProjectCacheDir
    if (-not $Repaired) {
      break
    }

    Write-Host "Retrying Gradle after cache repair..."
  }
}
finally {
  Pop-Location
}

exit $ExitCode
