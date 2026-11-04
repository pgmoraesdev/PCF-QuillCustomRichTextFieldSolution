$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

# The original TypeScript project is not included in this repository. Reuse its
# packaged Quill dependencies and styles; replace only the readable control module.
$root = Split-Path $PSScriptRoot -Parent
$baseline = Join-Path $root 'bin/Release/QuillRichTextField.zip'
$output = Join-Path $root 'bin/Release/QuillRichTextField_1_0_3_managed.zip'
$controlPath = 'Controls/pblab_CustomControl.CustomRichTextField/'
$source = [System.IO.File]::ReadAllText((Join-Path $root 'control/CustomRichTextField.js'))
$source = $source.Replace("import Quill from 'quill';", 'var Quill = __webpack_require__("./node_modules/quill/quill.js")["default"];')
$source = $source.Replace('export class CustomRichTextField', 'class CustomRichTextField')
$module = '__webpack_require__.r(__webpack_exports__); __webpack_require__.d(__webpack_exports__, { CustomRichTextField: () => CustomRichTextField });' + "`n" + $source
$encodedModule = ConvertTo-Json -InputObject $module -Compress
$manifest = [System.IO.File]::ReadAllText((Join-Path $root 'control/ControlManifest.xml'))
[xml]$manifestXml = $manifest
if ($manifestXml.manifest.control.version -ne '0.0.2' -or
    @($manifestXml.manifest.control.property | Where-Object name -eq 'ResetKey').Count -ne 1) {
    throw 'Invalid control manifest version or ResetKey property.'
}

$original = [System.IO.Compression.ZipFile]::OpenRead($baseline)
try {
    # OpenRead succeeds before replacing a previous generated package.
    $stream = [System.IO.File]::Open($output, [System.IO.FileMode]::Create)
    $archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($entry in $original.Entries) {
            $replacement = $null
            if ($entry.FullName -eq ($controlPath + 'bundle.js') -or $entry.FullName -eq 'solution.xml') {
                $reader = [System.IO.StreamReader]::new($entry.Open())
                try { $text = $reader.ReadToEnd() } finally { $reader.Dispose() }
                if ($entry.FullName -eq 'solution.xml') {
                    if (-not $text.Contains('<Version>1.0.2</Version>')) { throw 'Unexpected baseline solution version.' }
                    $replacement = $text.Replace('<Version>1.0.2</Version>', '<Version>1.0.3</Version>')
                } else {
                    # Fail if the baseline no longer starts with the expected control module.
                    $pattern = [regex]::new('eval\(("(?:[^"\\]|\\.)*")\)')
                    $match = $pattern.Match($text)
                    if (-not $match.Success -or -not $match.Value.Contains('class CustomRichTextField')) {
                        throw 'Cannot locate the baseline CustomRichTextField module.'
                    }
                    $replacement = $text.Substring(0, $match.Index) + 'eval(' + $encodedModule + ')' + $text.Substring($match.Index + $match.Length)
                }
            } elseif ($entry.FullName -eq ($controlPath + 'ControlManifest.xml')) {
                $replacement = $manifest
            }
            $target = $archive.CreateEntry($entry.FullName, [System.IO.Compression.CompressionLevel]::Optimal)
            $target.LastWriteTime = $entry.LastWriteTime
            $destination = $target.Open()
            try {
                if ($null -ne $replacement) {
                    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($replacement)
                    $destination.Write($bytes, 0, $bytes.Length)
                } else {
                    $inputStream = $entry.Open()
                    try { $inputStream.CopyTo($destination) } finally { $inputStream.Dispose() }
                }
            } finally { $destination.Dispose() }
        }
    } finally {
        $archive.Dispose()
        $stream.Dispose()
    }
} finally { $original.Dispose() }
Write-Output "Built $output"
