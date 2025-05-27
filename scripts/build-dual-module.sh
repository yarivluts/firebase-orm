#!/bin/bash

# Create directories if they don't exist
mkdir -p dist/cjs
mkdir -p dist/esm

# First build the CommonJS version with forced output
echo "Building CommonJS version..."
npx tsc -p tsconfig.json --skipLibCheck --skipDefaultLibCheck --noEmitOnError false --outDir dist/cjs --module commonjs

# Then build the ESM version with forced output
echo "Building ESM version..."
npx tsc -p tsconfig.json --skipLibCheck --skipDefaultLibCheck --noEmitOnError false --outDir dist/esm --module esnext --moduleResolution node

# Create package.json files for each directory
echo "Creating package.json for CJS..."
echo '{ "type": "commonjs" }' > dist/cjs/package.json

echo "Creating package.json for ESM..."
echo '{ "type": "module" }' > dist/esm/package.json

echo "Build complete!"