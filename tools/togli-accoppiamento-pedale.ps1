# Toglie l'accoppiamento Bluetooth vecchio del pedale (SparkPedale, 68:ee:8f:4f:da:1d)
# che Windows tiene ma che la pagina Impostazioni non mostra. È la stessa cosa del
# pulsante «Rimuovi». Il pedale va tenuto acceso in modalità MIDI.
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType = WindowsRuntime]
$metodi = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTask = $metodi | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Aspetta($op, [Type]$tipo) {
  $t = $asTask.MakeGenericMethod($tipo).Invoke($null, @($op))
  $null = $t.Wait(30000)
  $t.Result
}
$sel = 'System.Devices.Aep.ProtocolId:="{bb7bb05e-5972-42b5-94fc-76eaa7084d49}"'
$tipo = [Windows.Devices.Enumeration.DeviceInformationKind]::AssociationEndpoint
$prop = [string[]]@('System.Devices.Aep.DeviceAddress', 'System.Devices.Aep.IsPaired')
$tutti = Aspetta ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($sel, $prop, $tipo)) ([Windows.Devices.Enumeration.DeviceInformationCollection])
$pedale = $tutti | Where-Object { $_.Id -like '*68:ee:8f:4f:da:1d' } | Select-Object -First 1
if (-not $pedale) { "Pedale non trovato: è acceso e in modalità MIDI?"; return }
"Trovato: '$($pedale.Name)', accoppiato: $($pedale.Pairing.IsPaired)"
if (-not $pedale.Pairing.IsPaired) { "Non è accoppiato: niente da togliere."; return }
$esito = Aspetta ($pedale.Pairing.UnpairAsync()) ([Windows.Devices.Enumeration.DeviceUnpairingResult])
"Esito: $($esito.Status)"
