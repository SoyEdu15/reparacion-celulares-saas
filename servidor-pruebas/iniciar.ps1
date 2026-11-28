# Levanta el servidor de pruebas en este computador, lo publica en internet con
# un enlace FIJO de Tailscale Funnel (https://<equipo>.<red>.ts.net) y se queda
# VIGILANDO: si se cae Docker, la app, el worker o el Funnel, los vuelve a
# levantar solo. La app, la base de datos, Redis y MinIO solo escuchan en este
# equipo (localhost): desde internet solo se llega a la app, por el Funnel.
#
# Lo corre el Programador de tareas de Windows (tarea "Servidor reparaciones",
# ver instalar-tarea.ps1), asi no depende de ninguna ventana ni sesion abierta.
# A mano:  powershell -ExecutionPolicy Bypass -File servidor-pruebas\iniciar.ps1
#
# Los enlaces quedan en el Escritorio ("Enlaces del servidor.txt").

$ErrorActionPreference = 'Continue'
$raiz = Split-Path -Parent $PSScriptRoot
$aqui = $PSScriptRoot
$logs = Join-Path $aqui 'logs'
New-Item -ItemType Directory -Force $logs | Out-Null
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
  Start-Process -WindowStyle Hidden -WorkingDirectory $raiz cmd.exe -ArgumentList '/c', "npm run start -- -p 3000 -H localhost >> `"$logs\app.log`" 2>&1"
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

# El enlace FIJO lo da Tailscale Funnel (https://<equipo>.<red>.ts.net). El
# servicio de Tailscale arranca solo con Windows y recuerda la configuracion;
# aqui solo se revisa que siga encendido.
$tailscale = 'C:\Program Files\Tailscale\tailscale.exe'

function UrlFija {
  try {
    $dns = (& $tailscale status --json 2>$null | ConvertFrom-Json).Self.DNSName
    if ($dns) { return 'https://' + $dns.TrimEnd('.') }
  } catch {}
  return $null
}

function FunnelActivo {
  return [bool]((& $tailscale funnel status 2>$null) -match 'Funnel on')
}

function ActivarFunnel {
  Escribir 'Activando el enlace fijo (Tailscale Funnel)...'
  $p = Start-Process $tailscale -ArgumentList 'funnel', '--bg', '--yes', 'http://localhost:3000' -WindowStyle Hidden -PassThru
  if (-not $p.WaitForExit(60000)) { $p.Kill(); Escribir 'Tailscale no activo el Funnel (revisa que Tailscale tenga la sesion iniciada).' }
}

function EnlaceResponde($url) {
  if (-not $url) { return $false }
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
  $texto += 'Panel de administracion: SOLO desde este computador, en http://admin.localhost:3000'
  $texto += '(por seguridad no se publica en internet).'
  $texto += ''
  $texto += "Direccion base (fija, no cambia): $url"
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
# El tunel temporal de Cloudflare ya no se usa: una sola entrada desde internet.
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (-not (FunnelActivo)) { ActivarFunnel }
$url = UrlFija
if ($url) { EscribirEnlaces $url }

# ---------------------------------------------------------------- Vigilancia
# Cada minuto revisa cada pieza y levanta la que se haya caido.
$fallosEnlace = 0
while ($true) {
  Start-Sleep -Seconds 60
  MantenerDespierto
  if (-not (DockerListo)) { Escribir 'Docker se cayo.'; ArrancarDocker | Out-Null }
  if (-not (AppResponde)) { Escribir 'La app no responde.'; ArrancarApp }
  if (-not (WorkerVivo)) { Escribir 'El worker se cayo.'; ArrancarWorker }
  if ((Get-Service Tailscale -ErrorAction SilentlyContinue).Status -ne 'Running') {
    Escribir 'El servicio de Tailscale estaba detenido; se inicia.'
    Start-Service Tailscale -ErrorAction SilentlyContinue
  }
  if (-not (FunnelActivo)) { ActivarFunnel }
  if (-not $url) { $url = UrlFija; if ($url) { EscribirEnlaces $url } }
  if (EnlaceResponde $url) {
    if ($fallosEnlace -ge 3) { Escribir 'El enlace fijo volvio a responder.' }
    $fallosEnlace = 0
  } else {
    $fallosEnlace++
    if ($fallosEnlace -eq 3) { Escribir 'El enlace fijo no responde desde hace 3 minutos (puede ser el internet). Se sigue revisando.' }
  }
}
