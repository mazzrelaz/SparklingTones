param([string]$Porta = 'COM3', [int]$Http = 8095)
# Il ponte per tools/wah.html (24 ottobre 2026): tiene la seriale del pedale e
# serve la pagina su http://localhost:8095/. Web Serial in Edge non si e'
# collegato, e da qui la pagina si prova anche dal riquadro del browser.
#
# La seriale come in tools/ascolta-pedale.ps1: il core ESP32 scrive solo con
# DTR e RTS alti, e va in download mode se le linee passano per (0,1) (1,1)
# (1,0) (0,0). Si apre con tutte e due alte e si chiude abbassando prima il
# DTR. MAI chiudere uccidendo il processo: si crea il file "basta-wah" in
# $env:TEMP, o si chiama /basta, e lo script esce da solo.
#
#   POST /manda      il corpo va al pedale cosi' com'e'
#   GET  /registro?da=N   le righe del pedale dalla N-esima: {"fino":M,"righe":[...]}
#   GET  /basta      chiude tutto
#   GET  /           la pagina; /src/spark-protocol.js per la rilettura
$radice = Split-Path -Parent $PSScriptRoot
$basta = Join-Path $env:TEMP 'basta-wah'
Remove-Item $basta -ErrorAction SilentlyContinue

$p = New-Object System.IO.Ports.SerialPort $Porta, 115200
$p.DtrEnable = $true
$p.RtsEnable = $true
$p.Open()

$righe = New-Object System.Collections.Generic.List[string]
$script:resto = ''
$script:persaDa = $null
# Se il pedale si riavvia la porta sparisce e torna: si riapre, e nel
# registro resta una riga che lo dice (cosi' si vede anche un riavvio).
function Leggi {
  if (-not $p.IsOpen) {
    if (((Get-Date) - $script:persaDa).TotalMilliseconds -lt 500) { return }
    $script:persaDa = Get-Date
    try { $p.Open(); $righe.Add('[ponte] porta riaperta: il pedale e'' ripartito?') } catch { }
    return
  }
  try { $t = $p.ReadExisting() } catch {
    $righe.Add('[ponte] porta persa')
    try { $p.Close() } catch { }
    $script:persaDa = Get-Date
    return
  }
  if (-not $t) { return }
  $parti = ($script:resto + $t) -split "`n"
  $script:resto = $parti[-1]
  for ($i = 0; $i -lt $parti.Count - 1; $i++) { $righe.Add($parti[$i].TrimEnd()) }
}

function Rispondi($ctx, [byte[]]$b, [string]$tipo, [int]$codice = 200) {
  $ctx.Response.StatusCode = $codice
  $ctx.Response.ContentType = $tipo
  $ctx.Response.Headers.Add('Cache-Control', 'no-store')
  $ctx.Response.ContentLength64 = $b.Length
  $ctx.Response.OutputStream.Write($b, 0, $b.Length)
  $ctx.Response.Close()
}
$utf8 = New-Object System.Text.UTF8Encoding $false

$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Http/")
$l.Start()
Write-Output "ponte pronto: http://localhost:$Http/  (porta $Porta)"

$fine = $false
try {
  $attesa = $l.GetContextAsync()
  while (-not $fine -and -not (Test-Path $basta)) {
    Leggi
    if (-not $attesa.Wait(15)) { continue }
    $ctx = $attesa.Result
    $attesa = $l.GetContextAsync()
    $via = $ctx.Request.Url.AbsolutePath
    try {
      if ($via -eq '/manda' -and $ctx.Request.HttpMethod -eq 'POST') {
        $testo = (New-Object System.IO.StreamReader($ctx.Request.InputStream, $utf8)).ReadToEnd()
        if ($p.IsOpen) { $p.Write($testo) }
        Rispondi $ctx $utf8.GetBytes('ok') 'text/plain'
      } elseif ($via -eq '/registro') {
        $da = [int]$ctx.Request.QueryString['da']
        if ($da -lt 0 -or $da -gt $righe.Count) { $da = $righe.Count }
        $nuove = [string[]]$righe.GetRange($da, $righe.Count - $da).ToArray()
        $json = ConvertTo-Json -Compress -InputObject @{ fino = $righe.Count; righe = $nuove }
        Rispondi $ctx $utf8.GetBytes($json) 'application/json'
      } elseif ($via -eq '/basta') {
        $fine = $true
        Rispondi $ctx $utf8.GetBytes('chiuso') 'text/plain'
      } elseif ($via -eq '/' -or $via -eq '/tools/wah.html') {
        Rispondi $ctx ([System.IO.File]::ReadAllBytes((Join-Path $radice 'tools\wah.html'))) 'text/html; charset=utf-8'
      } elseif ($via -eq '/src/spark-protocol.js') {
        Rispondi $ctx ([System.IO.File]::ReadAllBytes((Join-Path $radice 'src\spark-protocol.js'))) 'application/javascript; charset=utf-8'
      } else {
        Rispondi $ctx $utf8.GetBytes('non c''e''') 'text/plain' 404
      }
    } catch {
      Write-Output ("errore su " + $via + ": " + $_.Exception.Message)
    }
  }
} finally {
  if ($p.IsOpen) {
    $p.DtrEnable = $false
    Start-Sleep -Milliseconds 100
    $p.RtsEnable = $false
    Start-Sleep -Milliseconds 100
    $p.Close()
  }
  $l.Stop()
  Write-Output 'ponte chiuso'
}
