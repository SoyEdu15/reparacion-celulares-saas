# Desactiva (no borra) las reglas del firewall de Windows que dejan entrar desde
# la red a programas de servidor que no necesitan recibir conexiones de afuera.
# El servidor de pruebas no las necesita: todo escucha en localhost y sale a
# internet solo por Tailscale Funnel. Requiere administrador.
#   Para revertir: Enable-NetFirewallRule -DisplayName '<nombre>'
$programas = 'node\.exe$|com\.docker\.backend\.exe$|cloudflared\.exe$|httpd\.exe$|mysqld\.exe$|python\.exe$'
$log = Join-Path $PSScriptRoot 'logs\firewall.log'
$hechas = @()
Get-NetFirewallRule -Direction Inbound -Enabled True -Action Allow | ForEach-Object {
  $prog = ($_ | Get-NetFirewallApplicationFilter).Program
  $puerto = ($_ | Get-NetFirewallPortFilter).LocalPort
  if ($prog -match $programas -or ($_.DisplayName -eq 'WWW' -and $puerto -eq '80')) {
    $_ | Disable-NetFirewallRule
    $hechas += "{0} | {1} | {2}" -f $_.DisplayName, $_.Profile, $prog
  }
}
Set-NetFirewallProfile -Profile Domain,Private,Public -Enabled True
("[{0:yyyy-MM-dd HH:mm}] Reglas desactivadas:" -f (Get-Date)), $hechas | Add-Content $log
