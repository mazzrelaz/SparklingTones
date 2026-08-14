# Legge un btsnoop_hci.log di Android e ne tira fuori la conversazione con lo Spark,
# nelle due direzioni, su un solo orologio.
#
# Serve per catturare quello che fa l'**app ufficiale**, che è l'unico modo di vedere
# comandi che non conosciamo: le notifiche in arrivo le sappiamo già leggere da soli
# con `tools/looper-probe.html`, ma quello che il telefono *manda* si vede solo qui.
#
# Come si ottiene il file, su Android moderno: il log sta in una cartella di sistema e
# nessun gestore file lo apre. Si tira fuori col rapporto di bug — `adb bugreport x.zip`
# — e dentro sta in `FS/data/log/bt/btsnoop_hci.log` (Samsung) oppure
# `FS/data/misc/bluetooth/logs/btsnoop_hci.log` (Android liscio). Ricordarsi che il log
# va messo su «Attivato» e non «Filtrato», e che dopo averlo attivato **il Bluetooth va
# spento e riacceso**, altrimenti non registra niente.
#
# Tre trappole, tutte pagate il 14 agosto 2026:
#
#  1. I campi del btsnoop sono big endian a 32 bit e vanno letti come **uint32**. Con
#     l'aritmetica con segno un valore col bit alto acceso diventa negativo e lo
#     scorrimento dei record si pianta al quarto — sembra un file vuoto e non lo è.
#  2. L'app ufficiale **non manda il messaggio in una scrittura sola**: lo spezza in ATT
#     Write Command da 20 byte e mette davanti al primo pezzo una **intestazione di
#     blocco da 16 byte** (`01 fe 00 00 53 fe <len> 00 …`). Cercando `f0 01 … f7` dentro
#     un singolo pacchetto si trovano solo i primi quattro byte e mai la fine: bisogna
#     concatenare le scritture e cercare nel flusso.
#  3. La direzione sta nel bit 0 dei flag del record: 0 = mandato dal telefono.

param(
  [Parameter(Mandatory=$true)][string]$File,
  [string]$Uscita
)

$b = [System.IO.File]::ReadAllBytes($File)

function BE32($a, $i) {
  ([uint32]$a[$i] -shl 24) -bor ([uint32]$a[$i+1] -shl 16) -bor
  ([uint32]$a[$i+2] -shl 8) -bor [uint32]$a[$i+3]
}
function Hex($by) { ($by | ForEach-Object { '{0:x2}' -f $_ }) -join ' ' }

$flusso = New-Object System.Collections.ArrayList   # byte scritti verso l'ampli, in fila
$tempi  = New-Object System.Collections.ArrayList
$ev     = New-Object System.Collections.ArrayList
$off    = 16                                        # header btsnoop

while ($off + 24 -le $b.Length) {
  $incl  = BE32 $b ($off+4)
  $flags = BE32 $b ($off+8)
  $ts    = (([int64](BE32 $b ($off+16))) -shl 32) -bor [int64](BE32 $b ($off+20))
  $p     = $off + 24
  if ($incl -le 0 -or $p + $incl -gt $b.Length) { break }

  if ($b[$p] -eq 0x02 -and $incl -ge 14) {          # pacchetto ACL
    $l2  = $b[$p+5] -bor ($b[$p+6] -shl 8)
    $cid = $b[$p+7] -bor ($b[$p+8] -shl 8)
    $opc = $b[$p+9]

    if (($flags -band 1) -eq 0 -and $cid -eq 4 -and ($opc -eq 0x52 -or $opc -eq 0x12)) {
      $vp = $p + 12                                  # dopo opcode e handle
      $vl = $l2 - 3
      if ($vl -gt 0 -and $vp + $vl -le $p + $incl) {
        $salta = 0
        if ($vl -ge 16 -and $b[$vp] -eq 0x01 -and $b[$vp+1] -eq 0xfe -and $b[$vp+4] -eq 0x53) {
          $salta = 16                                # intestazione di blocco dell'app
        }
        for ($i = $vp + $salta; $i -lt $vp + $vl; $i++) {
          [void]$flusso.Add($b[$i]); [void]$tempi.Add($ts)
        }
      }
    }

    if (($flags -band 1) -eq 1) {                    # notifiche in arrivo
      $fine = $p + $incl
      for ($i = $p; $i -lt $fine - 6; $i++) {
        if ($b[$i] -eq 0xf0 -and $b[$i+1] -eq 0x01) {
          $j = $i + 2
          while ($j -lt $fine -and $b[$j] -ne 0xf7) { $j++ }
          $len = $j - $i + 1
          if ($j -lt $fine -and $len -le 60 -and $b[$i+4] -ge 3 -and $b[$i+4] -le 5) {
            $by = New-Object byte[] $len; [Array]::Copy($b, $i, $by, 0, $len)
            [void]$ev.Add([pscustomobject]@{
              ts = $ts; dir = 'ampli'; cmd = $by[4]; sub = $by[5]; hex = (Hex $by) })
            $i = $j
          }
        }
      }
    }
  }
  $off = $p + $incl
}

$f = $flusso.ToArray(); $t = $tempi.ToArray()
for ($i = 0; $i -lt $f.Length - 6; $i++) {
  if ($f[$i] -eq 0xf0 -and $f[$i+1] -eq 0x01) {
    $j = $i + 2
    while ($j -lt $f.Length -and $f[$j] -ne 0xf7) { $j++ }
    $len = $j - $i + 1
    if ($j -lt $f.Length -and $len -le 300) {
      $by = New-Object byte[] $len; [Array]::Copy($f, $i, $by, 0, $len)
      [void]$ev.Add([pscustomobject]@{
        ts = $t[$i]; dir = 'APP'; cmd = $by[4]; sub = $by[5]; hex = (Hex $by) })
      $i = $j
    }
  }
}

$ord = @($ev | Sort-Object ts)
if ($ord.Count -eq 0) { "nessun messaggio Spark trovato"; return }
$t0 = $ord[0].ts
$micro = [double]1000000

$righe = @(
  "# Conversazione con lo Spark ricavata da un btsnoop_hci.log.",
  "# APP = mandato dal telefono, ampli = notifica in arrivo.",
  "# messaggi: $($ord.Count)  (dall'app: $(@($ord | Where-Object { $_.dir -eq 'APP' }).Count))",
  ""
) + ($ord | ForEach-Object {
  $sec = [math]::Round(([double]($_.ts - $t0)) / $micro, 3)
  "{0,9:n3}s  {1,-5}  0x{2:x2}{3:x2}   {4}" -f $sec, $_.dir, $_.cmd, $_.sub, $_.hex
})

if ($Uscita) {
  [System.IO.File]::WriteAllLines($Uscita, $righe, (New-Object System.Text.UTF8Encoding $false))
  "scritte $($righe.Count) righe in $Uscita"
} else {
  $righe
}
