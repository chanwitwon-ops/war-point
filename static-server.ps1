param(
    [int]$Port = 3000,
    [string]$RootDir = $PSScriptRoot
)

$mimeMap = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".md"   = "text/plain; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "Serving $RootDir at http://localhost:$Port/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        try {
            $urlPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
            if ($urlPath -eq "/") { $urlPath = "/index.html" }

            $filePath = Join-Path $RootDir ($urlPath.TrimStart("/"))
            $fullRoot = (Resolve-Path $RootDir).Path
            $resolvedFile = $null
            if (Test-Path $filePath) {
                $resolvedFile = (Resolve-Path $filePath).Path
            }

            if ($resolvedFile -and $resolvedFile.StartsWith($fullRoot) -and -not (Get-Item $resolvedFile).PSIsContainer) {
                $ext = [System.IO.Path]::GetExtension($resolvedFile).ToLower()
                $contentType = $mimeMap[$ext]
                if (-not $contentType) { $contentType = "application/octet-stream" }
                $bytes = [System.IO.File]::ReadAllBytes($resolvedFile)
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $notFoundBytes.Length
                $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
            }
        } catch {
            Write-Output "Request error: $_"
        } finally {
            $response.OutputStream.Close()
        }
    }
} finally {
    $listener.Stop()
}
