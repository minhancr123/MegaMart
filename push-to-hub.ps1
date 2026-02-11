Write-Host "Building Docker images..."
docker-compose build

Write-Host "Pushing Server image to Docker Hub (minhancr123/megamart:server)..."
docker push minhancr123/megamart:server

Write-Host "Pushing Nginx image to Docker Hub (minhancr123/megamart:nginx)..."
docker push minhancr123/megamart:nginx

Write-Host "Done! Images have been pushed to Docker Hub."
