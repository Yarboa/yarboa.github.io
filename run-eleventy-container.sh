#!/bin/bash

# Choose base image: ubi (default) or fedora
BASE_IMAGE=${1:-ubi}

if [ "$BASE_IMAGE" = "fedora" ]; then
  CONTAINERFILE="Containerfile.eleventy.fedora"
  IMAGE_TAG="yarboa-blog-eleventy:fedora"
  echo "Using Fedora base image..."
else
  CONTAINERFILE="Containerfile.eleventy"
  IMAGE_TAG="yarboa-blog-eleventy:ubi"
  echo "Using Red Hat UBI 9 with Node.js 20..."
fi

# Build the Eleventy container image
echo "Building Eleventy container..."
podman build -f $CONTAINERFILE -t $IMAGE_TAG .

# Run the container with volume mounted
echo "Starting Eleventy development server..."
podman run -it --rm \
  --name eleventy-dev \
  -v $(pwd):/app:Z \
  -p 8080:8080 \
  $IMAGE_TAG

# Access the blog at http://localhost:8080
