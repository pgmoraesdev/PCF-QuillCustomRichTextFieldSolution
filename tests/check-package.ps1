$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$baseline = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $root 'bin/Release/QuillRichTextField.zip'))
$package = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $root 'bin/Release/QuillRichTextField_1_0_3_managed.zip'))
$controlPath = 'Controls/pblab_CustomControl.CustomRichTextField/'
$temporaryBundle = [System.IO.Path]::GetTempFileName()
function Read-Entry($entry) {
    $reader = [System.IO.StreamReader]::new($entry.Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}
try {
    [xml]$solution = Read-Entry $package.GetEntry('solution.xml')
    if ($solution.ImportExportXml.SolutionManifest.Version -ne '1.0.3' -or
        $solution.ImportExportXml.SolutionManifest.Managed -ne '1') { throw 'Wrong solution version/type.' }
    [xml]$manifest = Read-Entry $package.GetEntry($controlPath + 'ControlManifest.xml')
    $key = @($manifest.manifest.control.property | Where-Object name -eq 'ResetKey')
    if ($manifest.manifest.control.version -ne '0.0.2' -or $key.Count -ne 1 -or
        $key[0].'of-type' -ne 'Whole.None' -or $key[0].usage -ne 'input') { throw 'Invalid reset manifest.' }
    if ($package.Entries.Count -ne $baseline.Entries.Count) { throw 'Package entries changed.' }
    foreach ($entry in $baseline.Entries) {
        $updated = $package.GetEntry($entry.FullName)
        if ($null -eq $updated) { throw "Missing entry: $($entry.FullName)" }
        if ($entry.FullName -notin @('solution.xml', ($controlPath + 'ControlManifest.xml'), ($controlPath + 'bundle.js'))) {
            if ((Read-Entry $entry) -cne (Read-Entry $updated)) { throw "Unexpected change: $($entry.FullName)" }
        }
    }
    $originalBundle = Read-Entry $baseline.GetEntry($controlPath + 'bundle.js')
    $updatedBundle = Read-Entry $package.GetEntry($controlPath + 'bundle.js')
    $pattern = [regex]::new('eval\(("(?:[^"\\]|\\.)*")\)')
    if ($pattern.Replace($originalBundle, 'CONTROL_MODULE', 1) -cne $pattern.Replace($updatedBundle, 'CONTROL_MODULE', 1)) {
        throw 'Unexpected changes outside the control module.'
    }
    [System.IO.File]::WriteAllText($temporaryBundle, $updatedBundle, [System.Text.UTF8Encoding]::new($false))
    & node (Join-Path $PSScriptRoot 'reset.test.cjs') $temporaryBundle
    if ($LASTEXITCODE -ne 0) { throw 'Packaged control tests failed.' }
    Write-Output 'Package validation passed: versions, manifest, preserved assets, bundle syntax and reset behavior.'
} finally {
    $baseline.Dispose()
    $package.Dispose()
    Remove-Item -LiteralPath $temporaryBundle
}
