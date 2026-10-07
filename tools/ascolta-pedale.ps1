param([string]$Porta = 'COM3', [int]$Secondi = 900, [string]$Fuori = "$env:TEMP\seriale-pedale.txt")
# Legge la seriale del pedale e scrive ogni riga col tempo.
#
# Il core ESP32 (USBCDC.cpp) scrive solo con DTR e RTS alti, e va in download
# mode se le linee passano per (DTR,RTS) = (0,1) (1,1) (1,0) (0,0). Quindi: si
# aprono tutte e due alte, e in chiusura si abbassa PRIMA il DTR (0,1: torna a
# riposo) e poi l'RTS. MAI chiudere uccidendo il processo: si crea il file
# «basta» in $env:TEMP, e lo script esce da solo.
#
# Per mandare comandi al pedale senza chiudere la porta: si scrive il testo nel
# file «manda.txt» in $env:TEMP; lo script lo spedisce e lo cancella.
$basta = Join-Path $env:TEMP 'basta'
$manda = Join-Path $env:TEMP 'manda.txt'
Remove-Item $basta, $manda -ErrorAction SilentlyContinue
$p = New-Object System.IO.Ports.SerialPort $Porta, 115200
$p.DtrEnable = $true
$p.RtsEnable = $true
$p.ReadTimeout = 300
$p.Open()
$t0 = Get-Date
$w = New-Object System.IO.StreamWriter($Fuori, $false)
$w.AutoFlush = $true
Start-Sleep -Milliseconds 300
$p.Write("u")      # la batteria: una riga di risposta dice che la seriale funziona
try {
  while (((Get-Date) - $t0).TotalSeconds -lt $Secondi -and -not (Test-Path $basta)) {
    if (Test-Path $manda) {
      $testo = [System.IO.File]::ReadAllText($manda).Trim()
      Remove-Item $manda
      $p.Write($testo)
      $w.WriteLine(('{0,8:F3}  >> {1}' -f ((Get-Date) - $t0).TotalSeconds, $testo))
    }
    try {
      $riga = $p.ReadLine()
      $w.WriteLine(('{0,8:F3}  {1}' -f ((Get-Date) - $t0).TotalSeconds, $riga.TrimEnd()))
    } catch [System.TimeoutException] { }
  }
} finally {
  $p.DtrEnable = $false
  Start-Sleep -Milliseconds 100
  $p.RtsEnable = $false
  Start-Sleep -Milliseconds 100
  $p.Close()
  $w.Close()
}
