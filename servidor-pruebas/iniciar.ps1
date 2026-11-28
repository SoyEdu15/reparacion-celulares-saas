# Levanta el servidor de pruebas en este computador, lo publica por un tunel
# gratuito de Cloudflare (https://<algo>.trycloudflare.com) y se queda
# VIGILANDO: si se cae Docker, la app, el worker o el tunel, los vuelve a
# levantar solo y actualiza los enlaces.
#
# Lo corre el Programador de tareas de Windows (tarea "Servidor reparaciones",
# ver instalar-tarea.ps1), asi no depende de ninguna ventana ni sesion abierta.
# A mano:  powershell -ExecutionPolicy Bypass -File servidor-pruebas\iniciar.ps1
#
# El enlace del tunel CAMBIA cada vez que el tunel se reinicia; los enlaces
# vigentes siempre quedan en el Escritorio ("Enlaces del servidor.txt").

$ErrorActionPreference = 'Continue'
$raiz = Split-Path -Parent $PSScriptRoot
$aqui = $PSScriptRoot
$logs = Join-Path $aqui 'logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$cloudflared = Join-Path $aqui 'bin\cloudflared.exe'
$logTunel = Join-Path $logs 'tunel.log'
$logVigia = Join-Path $logs 'vigilante.log'
Set-Location $raiz

# Pide a Windows que no suspenda el equipo mientras este script viva
# (ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED).
Add-Type -Namespace Servidor -Name Energia -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
function MantenerDespierto { [Servidor.Energia]::SetThreadExecutionState([uint32]'0x80000041') | Out-Null }
MantenerDespierto

function Escribir($msg) {
  $linea = "[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $msg
  Write-Host $linea
  Add-Content -Path $logVigia -Value $linea -ErrorAction SilentlyContinue
}

function DockerListo {
  & docker info *> $null
  return $LASTEXITCODE -eq 0
}

function ArrancarDocker {
  if (DockerListo) { return $true }
  Escribir 'Iniciando Docker Desktop...'
  # Arreglo conocido en este equipo: Docker no arranca si quedan sockets viejos.
  Get-Process 'Docker Desktop', 'com.docker.backend' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  $u = $env:USERNAME
  & wsl -d Ubuntu -- rm -f "/mnt/c/Users/$u/AppData/Local/Docker/run/dockerInference" "/mnt/c/Users/$u/AppData/Local/docker-secrets-engine/engine.sock" "/mnt/c/Users/$u/AppData/Local/Docker/run/userAnalyticsOtlpHttp.sock" "/mnt/c/Users/$u/AppData/Local/Docker/run/dockerEthernetVfkit" 2>$null
  Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  $limite = (Get-Date).AddMinutes(5)
  while (-not (DockerListo)) {
    if ((Get-Date) -gt $limite) { Escribir 'Docker no arranco en 5 minutos; se reintenta en la siguiente vuelta.'; return $false }
    Start-Sleep -Seconds 5
  }
  & docker compose up -d *> (Join-Path $logs 'docker.log')
  $limite = (Get-Date).AddMinutes(2)
  do {
    Start-Sleep -Seconds 2
    & docker compose exec -T postgres pg_isready -U app_owner *> $null
  } until ($LASTEXITCODE -eq 0 -or (Get-Date) -gt $limite)
  Escribir 'Docker y la base de datos listos.'
  return $true
}

function AppResponde {
  try { return (Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/legal/sla' -TimeoutSec 8).StatusCode -eq 200 } catch { return $false }
}

function ArrancarApp {
  Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  Escribir 'Iniciando la app...'
  Start-Process -WindowStyle Hidden -WorkingDirectory $raiz cmd.exe -ArgumentList '/c', "npm run start -- -p 3000 >> `"$logs\app.log`" 2>&1"
  $limite = (Get-Date).AddMinutes(3)
  do { Start-Sleep -Seconds 2 } until ((AppResponde) -or (Get-Date) -gt $limite)
  if (AppResponde) { Escribir 'App lista.' } else { Escribir "La app no respondio. Revisa $logs\app.log" }
}

function WorkerVivo {
  return [bool](Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'scripts[\\/]worker' })
}

function ArrancarWorker {
  Escribir 'Iniciando el worker de notificaciones...'
  Start-Process -WindowStyle Hidden -WorkingDirectory $raiz cmd.exe -ArgumentList '/c', "npx tsx scripts/worker.ts >> `"$logs\worker.log`" 2>&1"
}

function ArrancarTunel {
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Escribir 'Abriendo el tunel de Cloudflare...'
  Remove-Item $logTunel -ErrorAction SilentlyContinue
  Start-Process -WindowStyle Hidden $cloudflared -ArgumentList 'tunnel', '--no-autoupdate', '--url', 'http://localhost:3000', '--logfile', "`"$logTunel`""
  $limite = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $limite) {
    Start-Sleep -Seconds 2
    if (Test-Path $logTunel) {
      $m = Select-String -Path $logTunel -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
      if ($m) { return $m.Matches[0].Value }
    }
  }
  Escribir "No se obtuvo el enlace del tunel. Revisa $logTunel"
  return $null
}

function TunelResponde($url) {
  if (-not $url) { return $false }
  if (-not (Get-Process cloudflared -ErrorAction SilentlyContinue)) { return $false }
  try { return (Invoke-WebRequest -UseBasicParsing -Uri "$url/legal/sla" -TimeoutSec 15).StatusCode -eq 200 } catch { return $false }
}

function EscribirEnlaces($url) {
  $filas = & docker compose exec -T postgres psql -U app_owner -d reparacion_celulares -tA -F '|' -c "select subdominio, coalesce(nombre_comercial, subdominio) from tenants where estado = 'ACTIVO' order by created_at"
  $texto = @()
  $texto += "ENLACES DEL SERVIDOR DE PRUEBAS  (actualizado $(Get-Date -Format 'yyyy-MM-dd HH:mm'))"
  $texto += ''
  $texto += 'Abre el enlace de cada taller una vez en cada celular, tablet o computador.'
  $texto += 'Despues basta con entrar a la direccion base, el navegador recuerda el taller.'
  $texto += ''
  foreach ($f in $filas) {
    if (-not $f) { continue }
    $p = $f.Split('|')
    $texto += ('{0,-28} {1}/?taller={2}' -f $p[1], $url, $p[0])
  }
  $texto += ''
  $texto += ('{0,-28} {1}/?panel=admin' -f 'Panel de administracion', $url)
  $texto += ''
  $texto += "Direccion base: $url"
  $texto += 'IMPORTANTE: si el tunel se reinicia (por ejemplo al reiniciar el computador), el enlace'
  $texto += 'cambia. Este archivo siempre tiene los enlaces vigentes.'
  $texto | Set-Content -Encoding UTF8 (Join-Path $aqui 'ENLACES.txt')
  $texto | Set-Content -Encoding UTF8 (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Enlaces del servidor.txt')
  Escribir "Enlaces actualizados. Enlace base: $url"
}

# ---------------------------------------------------------------- Arranque
Escribir '=== Arrancando el servidor de pruebas ==='
while (-not (ArrancarDocker)) { Start-Sleep -Seconds 30 }

# Apaga lo que haya quedado de una corrida anterior (o un "next dev" abierto a mano).
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'next (dev|start)|scripts[\\/]worker' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Escribir 'Aplicando migraciones pendientes...'
& npx prisma migrate deploy *> (Join-Path $logs 'migraciones.log')
if (-not (Test-Path (Join-Path $raiz '.next\BUILD_ID'))) {
  Escribir 'Compilando la app (solo la primera vez, tarda unos minutos)...'
  & npm run build *> (Join-Path $logs 'build.log')
}

ArrancarApp
ArrancarWorker
# Si el tunel de una corrida anterior sigue vivo y responde, se conserva:
# asi reiniciar este script NO cambia los enlaces.
$url = $null
if (Test-Path $logTunel) {
  $m = Select-String -Path $logTunel -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
  if ($m -and (TunelResponde $m.Matches[0].Value)) { $url = $m.Matches[0].Value; Escribir "Se conserva el tunel actual: $url" }
}
if (-not $url) { $url = ArrancarTunel }
if ($url) { EscribirEnlaces $url }

# ---------------------------------------------------------------- Vigilancia
# Cada minuto revisa cada pieza y levanta la que se haya caido.
$fallosTunel = 0
while ($true) {
  Start-Sleep -Seconds 60
  MantenerDespierto
  if (-not (DockerListo)) { Escribir 'Docker se cayo.'; ArrancarDocker | Out-Null }
  if (-not (AppResponde)) { Escribir 'La app no responde.'; ArrancarApp }
  if (-not (WorkerVivo)) { Escribir 'El worker se cayo.'; ArrancarWorker }
  if (TunelResponde $url) {
    $fallosTunel = 0
  } else {
    $fallosTunel++
    # cloudflared se reconecta solo tras cortes cortos de internet; solo se abre un
    # tunel nuevo (enlace nuevo) si lleva 10 minutos seguidos sin responder.
    if ($fallosTunel -ge 10 -or -not (Get-Process cloudflared -ErrorAction SilentlyContinue)) {
      Escribir 'El tunel no responde; se abre uno nuevo (el enlace cambia).'
      $nuevo = ArrancarTunel
      if ($nuevo) { $url = $nuevo; EscribirEnlaces $url }
      $fallosTunel = 0
    }
  }
}
