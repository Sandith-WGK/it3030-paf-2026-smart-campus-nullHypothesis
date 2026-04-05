Write-Host "Setting up isolated Maven environment..."
$mavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"
$mavenDir = "$PWD\.maven"

if (-not (Test-Path "$mavenDir\apache-maven-3.9.6\bin\mvn.cmd")) {
    Write-Host "Downloading Maven 3.9.6..."
    New-Item -ItemType Directory -Force -Path $mavenDir | Out-Null
    Invoke-WebRequest -Uri $mavenUrl -OutFile "$mavenDir\maven.zip"
    Write-Host "Extracting Maven..."
    Expand-Archive -Path "$mavenDir\maven.zip" -DestinationPath $mavenDir -Force
}

$env:Path = "$mavenDir\apache-maven-3.9.6\bin;" + $env:Path
Write-Host "Maven setup complete. Initializing Spring Boot Server..."
mvn spring-boot:run
