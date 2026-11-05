<#
  seriale-pedale.ps1 - Legge il seriale del pedale (prova-ble) per qualche secondo, e se serve gli
  manda dei comandi, SENZA mandarlo in download mode.

  La trappola (5 novembre 2026): con USB-OTG (TinyUSB) il core esp32 riavvia il chip nel caricatore
  quando vede la sequenza DTR/RTS di esptool. Aprire la porta con DTR alto e RTS basso e poi
  chiuderla (o abbassare il DTR) e' proprio quella sequenza: il pedale si ferma in COM13, lo schermo
  resta con l'ultima immagine, e sembra acceso. Rimedio: un upload. Qui si apre con RTS e DTR alti
  e si chiude abbassando prima il DTR e poi l'RTS: verificato, il pedale resta in COM3.

  Uso:
    .\seriale-pedale.ps1 -Secondi 20 -Comandi '#modo 3','Z'
  I comandi partono uno al secondo dopo l'apertura (le righe che cominciano con # vanno a capo da sole).
#>
param(
  [string]$Porta = 'COM3',
  [int]$Secondi = 10,
  [string[]]$Comandi = @()
)
$p = New-Object System.IO.Ports.SerialPort $Porta, 115200
$p.RtsEnable = $true
$p.DtrEnable = $true
$p.Open()
try {
  $inizio = Get-Date
  $fine = $inizio.AddSeconds($Secondi)
  $prossimo = 0
  while ((Get-Date) -lt $fine) {
    $t = ((Get-Date) - $inizio).TotalSeconds
    if ($prossimo -lt $Comandi.Count -and $t -ge ($prossimo + 1)) {
      $c = $Comandi[$prossimo]
      if ($c.StartsWith('#')) { $c += "`n" }
      $p.Write($c)
      $prossimo++
    }
    $testo = $p.ReadExisting()
    if ($testo) { [Console]::Out.Write($testo) }
    Start-Sleep -Milliseconds 100
  }
} finally {
  try { $p.DtrEnable = $false; Start-Sleep -Milliseconds 200; $p.RtsEnable = $false; Start-Sleep -Milliseconds 200 } catch {}
  try { $p.Close() } catch {}
}
