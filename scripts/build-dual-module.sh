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

# Fix ESM imports to add .js extensions
echo "Fixing ESM imports..."
node scripts/fix-esm-imports.js

# Validate that the ESM imports are correctly fixed
echo "Validating ESM imports..."
node scripts/validate-esm-imports.js

# Create package.json files for each directory
echo "Creating package.json for CJS..."
echo '{ "type": "commonjs" }' > dist/cjs/package.json

echo "Creating package.json for ESM..."
echo '{ "type": "module" }' > dist/esm/package.json

echo "Build complete!"