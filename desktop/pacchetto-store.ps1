# Il pacchetto .appx per il Microsoft Store (13 novembre 2026).
# Il makeappx che electron-builder si porta dietro (winCodeSign 2.6.0) su questo Windows non parte
# («configurazione affiancata non corretta»): electron-builder prepara manifest ed elenco dei file,
# poi il pacchetto lo fa il makeappx del Windows SDK. Si lancia con `npm.cmd run store`.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$versione = (Get-Content package.json -Raw | ConvertFrom-Json).version
$sdk = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Directory -Filter '10.*' |
  Sort-Object Name -Descending |
  ForEach-Object { Join-Path $_.FullName 'x64\makeappx.exe' } |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sdk) { throw 'makeappx non trovato: serve il Windows SDK' }

# Si ferma su makeappx, ma lascia dist\__appx-x64 pronto (quello vecchio va tolto prima).
if (Test-Path 'dist\__appx-x64') { Remove-Item 'dist\__appx-x64' -Recurse -Force }
& npx.cmd electron-builder --win appx
$mappa = 'dist\__appx-x64\mapping.txt'
if (-not (Test-Path $mappa)) { throw 'electron-builder non ha preparato il pacchetto' }

$uscita = "dist\SparklingTones-$versione.appx"
& $sdk pack /o /f $mappa /p $uscita
if ($LASTEXITCODE -ne 0) { throw 'makeappx ha dato errore' }
Write-Host "Pronto: $uscita"
