# Registra el servidor de pruebas en el Programador de tareas de Windows:
# arranca solo al iniciar sesion y no depende de ninguna ventana abierta.
#   powershell -ExecutionPolicy Bypass -File servidor-pruebas\instalar-tarea.ps1
$script = Join-Path $PSScriptRoot 'iniciar.ps1'
$accion = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`"" -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$disparador = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'Servidor reparaciones' -Action $accion -Trigger $disparador -Settings $ajustes -Principal $principal -Force | Out-Null
# El acceso de la carpeta Inicio ya no hace falta: lo reemplaza la tarea.
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) 'Servidor reparaciones.cmd') -ErrorAction SilentlyContinue
Write-Host 'Tarea "Servidor reparaciones" registrada.'
