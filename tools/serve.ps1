# Server statico minimo per provare la PWA senza pubblicarla: da file:// i
# service worker non esistono, da localhost sì. Niente Node, niente Python —
# solo HttpListener, che Windows ha già.
#
#   powershell -ExecutionPolicy Bypass -File tools\serve.ps1
#   poi apri http://localhost:8099/
#
# Si ferma con Ctrl+C, oppure chiedendo http://localhost:8099/__stop.

$root = Split-Path -Parent $PSScriptRoot
$prefix = 'http://localhost:8099/'

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.png'  = 'image/png'
  # Senza questi due il browser li prende per file da scaricare: il logo non
  # compare e i caratteri tornano a quelli di sistema, e sembra un difetto
  # dell'app mentre è solo questo server.
  '.svg'  = 'image/svg+xml'
  '.woff2'= 'font/woff2'
  '.css'  = 'text/css; charset=utf-8'
  '.zip'  = 'application/zip'
  '.txt'  = 'text/plain; charset=utf-8'
  '.md'   = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "in ascolto su $prefix"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
  if ($rel -eq '' ) { $rel = 'index.html' }
  if ($rel -eq '__stop') { $ctx.Response.StatusCode = 200; $ctx.Response.Close(); break }
  $file = Join-Path $root ($rel -replace '/', '\')

  if (Test-Path -LiteralPath $file -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $type = $mime[$ext]
    if (-not $type) { $type = 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ctx.Response.ContentType = $type
    $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    Write-Output "200 $rel"
  } else {
    $ctx.Response.StatusCode = 404
    $b = [System.Text.Encoding]::UTF8.GetBytes('404')
    $ctx.Response.OutputStream.Write($b, 0, $b.Length)
    Write-Output "404 $rel"
  }
  $ctx.Response.Close()
}
$listener.Stop()
