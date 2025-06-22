# Test script for ML gesture recognition endpoint
$body = @{
    landmarks = @(
        @{x = 0.1; y = 0.2; z = 0.3},
        @{x = 0.4; y = 0.5; z = 0.6},
        @{x = 0.7; y = 0.8; z = 0.9}
    )
} | ConvertTo-Json -Depth 3

$headers = @{
    'Content-Type' = 'application/json'
}

try {
    $response = Invoke-RestMethod -Uri 'https://9t2to2akvf.execute-api.eu-north-1.amazonaws.com/dev/gesture-recognition-ml' -Method Post -Headers $headers -Body $body
    Write-Host "ML Endpoint Response:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $streamReader.ReadToEnd()
        Write-Host "Error Response: $errorBody"
    }
}
