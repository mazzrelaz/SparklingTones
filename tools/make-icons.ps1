# Rigenera le icone della PWA in icons/. Le icone stanno nel repo già pronte:
# questo script serve solo se si vuole cambiare il disegno o aggiungere una
# misura. Disegna con System.Drawing, che Windows PowerShell ha già — nessun
# editor grafico e nessuna dipendenza da installare.
#
#   powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1

Add-Type -AssemblyName System.Drawing

$out = Join-Path (Split-Path -Parent $PSScriptRoot) 'icons'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }

function New-Icon {
  param([int]$Size, [string]$Path, [double]$Content = 0.86, [bool]$Rounded = $true)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))

  $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0x14, 0x16, 0x1a))
  if ($Rounded) {
    $r = [int]($Size * 0.22)
    $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shape.AddArc(0, 0, 2*$r, 2*$r, 180, 90)
    $shape.AddArc($Size-2*$r, 0, 2*$r, 2*$r, 270, 90)
    $shape.AddArc($Size-2*$r, $Size-2*$r, 2*$r, 2*$r, 0, 90)
    $shape.AddArc(0, $Size-2*$r, 2*$r, 2*$r, 90, 90)
    $shape.CloseFigure()
    $g.FillPath($bg, $shape)
    $shape.Dispose()
  } else {
    $g.FillRectangle($bg, 0, 0, $Size, $Size)
  }

  # Manopola: arco graduato con lancetta, il gesto piu' riconoscibile di un ampli.
  $c = $Size / 2.0
  $rad = $Size * 0.5 * $Content * 0.72      # raggio dell'arco
  $w = $Size * $Content * 0.115             # spessore
  $box = New-Object System.Drawing.RectangleF(($c - $rad), ($c - $rad), (2*$rad), (2*$rad))

  $track = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0x2f, 0x33, 0x3a), $w)
  $track.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $track.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($track, $box, 135, 270)

  $hot = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0xff, 0x6a, 0x3d), $w)
  $hot.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $hot.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($hot, $box, 135, 180)

  # Lancetta puntata alla fine dell'arco acceso (315 gradi: in alto a destra).
  $a = 315.0 * [Math]::PI / 180.0
  $r0 = $rad * 0.10
  $r1 = $rad * 0.60
  $pointer = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0xff, 0x6a, 0x3d), ($w * 0.92))
  $pointer.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pointer.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($pointer,
    [single]($c + $r0 * [Math]::Cos($a)), [single]($c + $r0 * [Math]::Sin($a)),
    [single]($c + $r1 * [Math]::Cos($a)), [single]($c + $r1 * [Math]::Sin($a)))

  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "$Path  ($Size px)"
}

New-Icon -Size 192 -Path "$out\icon-192.png" -Content 0.86 -Rounded $true
New-Icon -Size 512 -Path "$out\icon-512.png" -Content 0.86 -Rounded $true
New-Icon -Size 512 -Path "$out\icon-maskable-512.png" -Content 0.62 -Rounded $false
New-Icon -Size 180 -Path "$out\apple-touch-icon.png" -Content 0.80 -Rounded $false
New-Icon -Size 32  -Path "$out\favicon-32.png" -Content 0.94 -Rounded $true
