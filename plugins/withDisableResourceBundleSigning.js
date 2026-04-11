/**
 * Config plugin to disable code signing for resource bundles
 * Fixes: "Starting from Xcode 14, resource bundles are signed by default"
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withDisableResourceBundleSigning = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfileContent = fs.readFileSync(podfilePath, "utf-8");

      // Check if the fix is already applied
      if (podfileContent.includes("CODE_SIGNING_ALLOWED")) {
        console.log("✓ Resource bundle signing fix already applied");
        return config;
      }

      // The code to disable code signing for resource bundles
      const resourceBundleSigningFix = `
    # Fix for Xcode 14+ resource bundle signing
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
        target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end
`;

      // Find the post_install block and add our fix
      const postInstallRegex = /post_install\s+do\s+\|installer\|/;
      
      if (postInstallRegex.test(podfileContent)) {
        // Insert after the post_install line
        podfileContent = podfileContent.replace(
          postInstallRegex,
          `post_install do |installer|${resourceBundleSigningFix}`
        );
        console.log("✓ Added resource bundle signing fix to existing post_install");
      } else {
        // If no post_install exists, add one at the end of the target block
        const targetEndRegex = /^end\s*$/m;
        const lastEndMatch = podfileContent.lastIndexOf("\nend");
        
        if (lastEndMatch !== -1) {
          const postInstallBlock = `
post_install do |installer|
${resourceBundleSigningFix}
end

`;
          podfileContent = 
            podfileContent.slice(0, lastEndMatch) + 
            "\n" + postInstallBlock + 
            podfileContent.slice(lastEndMatch);
          console.log("✓ Added new post_install block with resource bundle signing fix");
        }
      }

      fs.writeFileSync(podfilePath, podfileContent, "utf-8");
      return config;
    },
  ]);
};

module.exports = withDisableResourceBundleSigning;
