# Rigenera le icone della PWA in icons/, partendo dal logo dell'utente.
#
#   powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
#
# Le icone stanno nel repo già pronte: questo script serve se cambia il logo
# o se serve una misura nuova.
#
# La sorgente è `icons/logo-mark.svg`, cioè il **simbolo da solo** ricavato da
# `icons/logo.svg`: il logotipo per esteso è largo cinque volte la sua altezza
# e dentro un quadrato diventerebbe illeggibile.
#
# Il disegno non viene ridisegnato a mano come prima: si fa rasterizzare l'SVG
# a Edge in modalità headless, così l'icona è **lo stesso file** del marchio e
# non una sua imitazione. Due cose imparate facendolo, che sembrano dettagli:
#
#   - headless non scende sotto una finestra di circa 500x500: chiedere uno
#     screenshot da 192 px dà un ritaglio dell'angolo in alto a sinistra, che
#     essendo vuoto esce **tutto nero**. Si rasterizza grande e si riduce.
#   - l'icona «maskable» viene ritagliata dal sistema dentro un cerchio, quindi
#     vuole più margine: il simbolo deve stare nell'80% centrale.

Add-Type -AssemblyName System.Drawing

$radice = Split-Path -Parent $PSScriptRoot
$out    = Join-Path $radice 'icons'
$marchio = Join-Path $out 'logo-mark.svg'
if (-not (Test-Path $marchio)) { throw "manca $marchio" }

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edge)) { throw "Edge non trovato in $edge" }

$temp = Join-Path $env:TEMP 'spark-icone'
New-Item -ItemType Directory -Force -Path $temp | Out-Null

# La paginetta che disegna il marchio a tutto quadrato, su fondo nero come
# l'app. Il margine arriva dall'url, perché cambia fra icona normale e maskable.
$pagina = Join-Path $temp 'icona.html'
@"
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  html, body { margin:0; padding:0; width:100%; height:100%; background:#000; overflow:hidden; }
  img { display:block; width:100%; height:100%; box-sizing:border-box; }
</style></head><body>
<img id="m" src="file:///$($marchio -replace '\\','/')">
<script>
  document.getElementById('m').style.padding =
    (new URLSearchParams(location.search).get('p') || '6') + '%';
</script>
</body></html>
"@ | Set-Content -Path $pagina -Encoding UTF8

function New-Master {
  param([int]$Margine, [string]$Destinazione)
  $url = 'file:///' + ($pagina -replace '\\','/') + "?p=$Margine"
  & $edge --headless=new --disable-gpu --no-first-run `
          --user-data-dir="$temp\profilo" --allow-file-access-from-files `
          --window-size=1024,1024 --virtual-time-budget=4000 `
          --screenshot=$Destinazione $url 2>&1 | Out-Null
  if (-not (Test-Path $Destinazione)) { throw "rasterizzazione fallita: $Destinazione" }
}

function Riduci {
  param([string]$Sorgente, [string]$Destinazione, [int]$Lato)
  $src = [System.Drawing.Image]::FromFile($Sorgente)
  $bmp = New-Object System.Drawing.Bitmap($Lato, $Lato)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode   = 'HighQuality'
  $g.SmoothingMode     = 'HighQuality'
  $g.DrawImage($src, 0, 0, $Lato, $Lato)
  $g.Dispose()
  $bmp.Save($Destinazione, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose(); $src.Dispose()
  Write-Host ("{0,-24} {1} px" -f [IO.Path]::GetFileName($Destinazione), $Lato)
}

$master     = Join-Path $temp 'master-1024.png'
$masterMask = Join-Path $temp 'master-mask-1024.png'
New-Master -Margine 6  -Destinazione $master
New-Master -Margine 16 -Destinazione $masterMask

Riduci $master     (Join-Path $out 'icon-512.png')          512
Riduci $master     (Join-Path $out 'icon-192.png')          192
Riduci $master     (Join-Path $out 'apple-touch-icon.png')  180
Riduci $master     (Join-Path $out 'favicon-32.png')        32
Riduci $masterMask (Join-Path $out 'icon-maskable-512.png') 512

Write-Host "`nFatte. Alza VERSIONE in sw.js, altrimenti chi ha l'app installata"
Write-Host "continua a vedere le icone vecchie dalla cache."
