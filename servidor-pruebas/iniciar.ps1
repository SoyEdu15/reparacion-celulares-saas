# Levanta el servidor de pruebas en este computador y publica la app por un
# tunel gratuito de Cloudflare (https://<algo>.trycloudflare.com).
#
#   powershell -ExecutionPolicy Bypass -File servidor-pruebas\iniciar.ps1
#
# 1. Docker (Postgres, Redis, MinIO, Maildev)  2. App en modo produccion
# 3. Worker de notificaciones  4. Tunel  5. Enlaces de cada taller en el
# Escritorio ("Enlaces del servidor.txt").
# El enlace del tunel CAMBIA cada vez que se reinicia; este script escribe
# siempre los enlaces nuevos.

$ErrorActionPreference = 'Continue'
$raiz = Split-Path -Parent $PSScriptRoot
$aqui = $PSScriptRoot
$logs = Join-Path $aqui 'logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$cloudflared = Join-Path $aqui 'bin\cloudflared.exe'
Set-Location $raiz

function Escribir($msg) { Write-Host ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $msg) }

function DockerListo {
  & docker info *> $null
  return $LASTEXITCODE -eq 0
}

# ---------------------------------------------------------------- 1. Docker
if (-not (DockerListo)) {
  Escribir 'Iniciando Docker Desktop...'
  $dockerExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  # Arreglo conocido en este equipo: Docker no arranca si quedan sockets viejos.
  Get-Process 'Docker Desktop', 'com.docker.backend' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  $u = $env:USERNAME
  & wsl -d Ubuntu -- rm -f "/mnt/c/Users/$u/AppData/Local/Docker/run/dockerInference" "/mnt/c/Users/$u/AppData/Local/docker-secrets-engine/engine.sock" "/mnt/c/Users/$u/AppData/Local/Docker/run/userAnalyticsOtlpHttp.sock" "/mnt/c/Users/$u/AppData/Local/Docker/run/dockerEthernetVfkit" 2>$null
  Start-Process $dockerExe
  $limite = (Get-Date).AddMinutes(4)
  while (-not (DockerListo)) {
    if ((Get-Date) -gt $limite) { throw 'Docker no arranco en 4 minutos. Abre Docker Desktop a mano y vuelve a correr este script.' }
    Start-Sleep -Seconds 5
  }
}
Escribir 'Docker listo. Levantando base de datos y servicios...'
& docker compose up -d *> (Join-Path $logs 'docker.log')

# Espera a Postgres
$limite = (Get-Date).AddMinutes(2)
do {
  Start-Sleep -Seconds 2
  & docker compose exec -T postgres pg_isready -U app_owner *> $null
} until ($LASTEXITCODE -eq 0 -or (Get-Date) -gt $limite)

# ---------------------------------------------------------------- 2-3. App y worker
Escribir 'Deteniendo procesos anteriores...'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'next (dev|start)|scripts[\\/]worker' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
# Lo que siga ocupando el puerto 3000 (por ejemplo un "next dev" abierto a mano).
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Escribir 'Aplicando migraciones pendientes...'
& npx prisma migrate deploy *> (Join-Path $logs 'migraciones.log')

if (-not (Test-Path (Join-Path $raiz '.next\BUILD_ID'))) {
  Escribir 'Compilando la app (solo la primera vez, tarda unos minutos)...'
  & npm run build *> (Join-Path $logs 'build.log')
}

Escribir 'Iniciando la app...'
Start-Process -WindowStyle Hidden -WorkingDirectory $raiz cmd.exe -ArgumentList '/c', "npm run start -- -p 3000 > `"$logs\app.log`" 2>&1"
Escribir 'Iniciando el worker de notificaciones...'
Start-Process -WindowStyle Hidden -WorkingDirectory $raiz cmd.exe -ArgumentList '/c', "npx tsx scripts/worker.ts > `"$logs\worker.log`" 2>&1"

$limite = (Get-Date).AddMinutes(3)
do {
  Start-Sleep -Seconds 2
  try { $ok = (Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/legal/sla' -TimeoutSec 5).StatusCode -eq 200 } catch { $ok = $false }
} until ($ok -or (Get-Date) -gt $limite)
if (-not $ok) { throw "La app no respondio. Revisa $logs\app.log" }

# ---------------------------------------------------------------- 4. Tunel
Escribir 'Abriendo el tunel de Cloudflare...'
$logTunel = Join-Path $logs 'tunel.log'
Remove-Item $logTunel -ErrorAction SilentlyContinue
Start-Process -WindowStyle Hidden $cloudflared -ArgumentList 'tunnel', '--no-autoupdate', '--url', 'http://localhost:3000', '--logfile', "`"$logTunel`""
$url = $null
$limite = (Get-Date).AddMinutes(2)
while (-not $url -and (Get-Date) -lt $limite) {
  Start-Sleep -Seconds 2
  if (Test-Path $logTunel) {
    $m = Select-String -Path $logTunel -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) { throw "No se obtuvo el enlace del tunel. Revisa $logTunel" }

# ---------------------------------------------------------------- 5. Enlaces
$filas = & docker compose exec -T postgres psql -U app_owner -d reparacion_celulares -tA -F '|' -c "select subdominio, coalesce(nombre_comercial, subdominio) from tenants where estado = 'ACTIVO' order by created_at"
$texto = @()
$texto += "ENLACES DEL SERVIDOR DE PRUEBAS  ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))"
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
$texto += 'IMPORTANTE: si el computador se reinicia, el enlace cambia. Vuelve a correr este script'
$texto += '(o espera a que arranque solo al iniciar sesion) y usa los enlaces nuevos.'

$texto | Set-Content -Encoding UTF8 (Join-Path $aqui 'ENLACES.txt')
$escritorio = [Environment]::GetFolderPath('Desktop')
$texto | Set-Content -Encoding UTF8 (Join-Path $escritorio 'Enlaces del servidor.txt')
Escribir "Listo. Enlace base: $url"
$texto | ForEach-Object { Write-Host $_ }
