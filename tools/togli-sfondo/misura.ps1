param([string]$Immagine, [string]$Profili = '')
# Trova i puntini bianchi (centri delle manopole), la spia rossa e, con -Profili 'x,y,lunghezza;...',
# i picchi di luce a destra, sinistra, su e giu da un punto (gli anelli delle scale). Pixel dell'originale.
$qui = Split-Path -Parent $MyInvocation.MyCommand.Path
$pagina = 'file:///' + ($qui -replace '\\', '/') + '/misura.html?img=' +
          [uri]::EscapeDataString('file:///' + ($Immagine -replace '\\', '/')) + '&profili=' + $Profili
$dom = Join-Path $env:TEMP 'misura-dom.txt'
Start-Process -FilePath 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList `
  '--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$env:TEMP\claude\edge-prof-sfondo",
  '--allow-file-access-from-files', '--virtual-time-budget=30000', '--dump-dom', "`"$pagina`"" `
  -RedirectStandardOutput $dom -Wait
$t = [IO.File]::ReadAllText($dom)
if ($t -match '(?s)<pre id="out">(.*?)</pre>') { $Matches[1] } else { $t.Substring(0, [Math]::Min(300, $t.Length)) }
