# SparklingTones per Windows: chiede a Windows l'intervallo di connessione Bluetooth corto
# per lo Spark (12 novembre 2026). Windows tiene 30 ms, e un preset dei banchi costa ~80 ms
# a pezzo; col pedale, a 7,5 ms, lo stesso preset va tre volte più veloce (docs/pedale.md).
# Il browser non lo può chiedere; Windows 11 sì, a un programma, finché la richiesta resta
# aperta. Per questo lo script resta acceso: lo lancia main.js e lo spegne all'uscita.
# Solo lettura e una richiesta di parametri: non manda niente allo Spark.
param(
  [Parameter(Mandatory = $true)][string]$Indirizzo,   # «aa:bb:cc:dd:ee:ff»
  [switch]$Prova                                       # controlla solo che l'API ci sia
)
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
$null = [Windows.Devices.Bluetooth.BluetoothLEPreferredConnectionParameters, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]

$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Aspetta($op, [Type]$tipo) {
  $t = $asTask.MakeGenericMethod($tipo).Invoke($null, @($op))
  $null = $t.Wait(-1)
  $t.Result
}

$metodo = [Windows.Devices.Bluetooth.BluetoothLEDevice].GetMethod('RequestPreferredConnectionParameters')
if (-not $metodo) { Write-Output 'veloce: questo Windows non ha la richiesta (serve Windows 11)'; exit 1 }
if ($Prova) { Write-Output 'veloce: API presente'; exit 0 }

$numero = [Convert]::ToUInt64(($Indirizzo -replace '[:-]', ''), 16)
$dev = Aspetta ([Windows.Devices.Bluetooth.BluetoothLEDevice]::FromBluetoothAddressAsync($numero)) ([Windows.Devices.Bluetooth.BluetoothLEDevice])
if (-not $dev) { Write-Output "veloce: dispositivo $Indirizzo non trovato"; exit 1 }

$richiesta = $null
$giaDetto = ''
while ($true) {
  $connesso = $dev.ConnectionStatus -eq [Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected
  if ($connesso -and -not $richiesta) {
    # Si lascia finire all'app la lettura dei servizi: cambiare l'intervallo proprio
    # in quel momento sembra far cadere la connessione appena aperta (12 novembre 2026).
    Start-Sleep -Seconds 3
    try {
      $richiesta = $dev.RequestPreferredConnectionParameters([Windows.Devices.Bluetooth.BluetoothLEPreferredConnectionParameters]::ThroughputOptimized)
      Write-Output "veloce: richiesta a $($dev.Name): $($richiesta.Status)"
    } catch { Write-Output "veloce: errore $($_.Exception.Message)" ; Start-Sleep -Seconds 5 }
  }
  if (-not $connesso -and $richiesta) {
    $richiesta.Dispose(); $richiesta = $null
    Write-Output 'veloce: Spark staccato, si richiede al prossimo collegamento'
  }
  try {
    $p = $dev.GetConnectionParameters()
    $ora = "intervallo $($p.ConnectionInterval * 1.25) ms"
    if ($ora -ne $giaDetto) { Write-Output "veloce: $ora"; $giaDetto = $ora }
  } catch { }
  Start-Sleep -Milliseconds 500
}
