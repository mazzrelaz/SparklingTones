param([string]$Cartella, [string]$Uscita)
# Converte i PNG di $Cartella in WebP dentro $Uscita, con converti.html in Edge headless (a gruppi di 10).
$qui = Split-Path -Parent $MyInvocation.MyCommand.Path
$file = Get-ChildItem -LiteralPath $Cartella -Filter *.png | Sort-Object Name | ForEach-Object { $_.Name }
New-Item -ItemType Directory -Force $Uscita | Out-Null
$dir = 'file:///' + ($Cartella -replace '\\', '/')
for ($i = 0; $i -lt $file.Count; $i += 10) {
  $gruppo = $file[$i..([Math]::Min($i + 9, $file.Count - 1))] -join ','
  $pagina = 'file:///' + ($qui -replace '\\', '/') + '/converti.html?dir=' + [uri]::EscapeDataString($dir) +
            '&files=' + [uri]::EscapeDataString($gruppo)
  $dom = Join-Path $qui ('dom-' + $i + '.txt')
  Start-Process -FilePath 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList `
    '--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$qui\profilo-edge",
    '--allow-file-access-from-files', '--virtual-time-budget=60000', '--dump-dom', "`"$pagina`"" `
    -RedirectStandardOutput $dom -Wait
}
& node (Join-Path $qui 'scrivi.js') $qui $Uscita
