param([string]$Immagine, [string]$Uscita, [string]$Extra = '')
# Toglie lo sfondo con togli-sfondo.html in Edge headless; scrive il PNG e stampa il taglio.
$qui = Split-Path -Parent $MyInvocation.MyCommand.Path
$pagina = 'file:///' + ($qui -replace '\\', '/') + '/togli-sfondo.html?img=' +
          [uri]::EscapeDataString('file:///' + ($Immagine -replace '\\', '/')) + $Extra
$dom = Join-Path $qui 'dom.txt'
Start-Process -FilePath 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList `
  '--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$env:TEMP\claude\edge-prof-sfondo",
  '--allow-file-access-from-files', '--virtual-time-budget=30000', '--dump-dom', "`"$pagina`"" `
  -RedirectStandardOutput $dom -Wait
& node -e @'
const fs = require('fs');
const t = fs.readFileSync(process.argv[1], 'utf8');
const m = t.match(/TAGLIO (\d+) (\d+) (\d+) (\d+)\s+data:image\/png;base64,([A-Za-z0-9+\/=]+)/);
if (!m) { console.log('niente: ' + t.slice(0, 300)); process.exit(1); }
fs.writeFileSync(process.argv[2], Buffer.from(m[5], 'base64'));
console.log('taglio x ' + m[1] + ' y ' + m[2] + ' -> ' + m[3] + ' x ' + m[4]);
'@ $dom $Uscita
