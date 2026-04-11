#!/bin/bash
# Script to fix resource bundle code signing for Xcode 14+

set -e

echo "Running expo prebuild..."
npx expo prebuild --clean

echo "Applying resource bundle code signing fix to Podfile..."

# Create a backup and apply the fix
PODFILE="ios/Podfile"

if [ -f "$PODFILE" ]; then
  # Check if fix is already applied
  if grep -q "com.apple.product-type.bundle" "$PODFILE"; then
    echo "Resource bundle signing fix already applied"
  else
    # Use Ruby to safely modify the Podfile
    ruby << 'RUBY'
podfile_path = "ios/Podfile"
content = File.read(podfile_path)

fix_code = <<-FIX

    # Fix for Xcode 14+ resource bundle signing
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
        target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end
FIX

# Insert after post_install do |installer|
content = content.gsub(/post_install do \|installer\|/) do |match|
  "#{match}#{fix_code}"
end

File.write(podfile_path, content)
puts "Successfully applied resource bundle signing fix"
RUBY
  fi
else
  echo "Error: Podfile not found at $PODFILE"
  exit 1
fi

echo "Prebuild complete with code signing fix applied"
