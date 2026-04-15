/**
 * withIconComposer — Expo Config Plugin
 *
 * Integrates an Apple Icon Composer (.icon) file into the Xcode project
 * so Xcode 26+ renders the app icon from the layered .icon bundle.
 *
 * Apple's workflow: "drag it into Xcode, and choose your icon in the
 * Project Editor." This plugin automates both steps during prebuild.
 *
 * Steps:
 *   1. Copies .icon bundle into ios/<AppName>/
 *   2. Removes default AppIcon.appiconset from Images.xcassets
 *   3. Adds .icon as a file reference + build resource in the Xcode project
 *   4. Sets ASSETCATALOG_COMPILER_APPICON_NAME to the .icon name
 */

const {
  withXcodeProject,
  withDangerousMod,
} = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function rmDirSync(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rmDirSync(p);
    } else {
      fs.unlinkSync(p);
    }
  }
  fs.rmdirSync(dir);
}

function withIconComposerFile(config, { iconPath }) {
  // Step 1: Copy .icon bundle into ios/<AppName>/ and remove AppIcon.appiconset
  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const appName = cfg.modRequest.projectName;

      const srcIcon = path.resolve(projectRoot, iconPath);
      const iconFilename = path.basename(srcIcon);
      const destIcon = path.join(platformRoot, appName, iconFilename);

      if (!fs.existsSync(srcIcon)) {
        throw new Error(
          `withIconComposer: .icon file not found at ${srcIcon}`
        );
      }

      // Copy the .icon bundle alongside other project files
      console.log(`  › Copying ${iconFilename} to ${appName}/`);
      if (fs.existsSync(destIcon)) {
        rmDirSync(destIcon);
      }
      copyDirSync(srcIcon, destIcon);

      // Remove the default AppIcon.appiconset so there's no conflict
      const appiconset = path.join(
        platformRoot,
        appName,
        "Images.xcassets",
        "AppIcon.appiconset"
      );
      if (fs.existsSync(appiconset)) {
        console.log("  › Removing default AppIcon.appiconset");
        rmDirSync(appiconset);
      }

      return cfg;
    },
  ]);

  // Step 2: Add .icon to the Xcode project and set build settings
  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const appName = cfg.modRequest.projectName;
    const iconFilename = path.basename(iconPath);
    const iconName = path.basename(iconFilename, ".icon");

    const objects = project.hash.project.objects;

    // ── Add .icon as a PBXFileReference ──
    // Use "folder.assetcatalog" so the build system passes it to actool
    // as an additional icon catalog input (same as .xcassets).
    // Xcode 26's actool understands .icon format natively.
    const fileRefId = project.generateUuid();
    objects.PBXFileReference = objects.PBXFileReference || {};
    objects.PBXFileReference[fileRefId] = {
      isa: "PBXFileReference",
      lastKnownFileType: "folder.assetcatalog",
      name: `"${iconFilename}"`,
      path: `"${appName}/${iconFilename}"`,
      sourceTree: '"<group>"',
    };
    objects.PBXFileReference[`${fileRefId}_comment`] = iconFilename;

    // ── Add to the app's PBXGroup children ──
    const appGroupKey = Object.keys(objects.PBXGroup).find((key) => {
      const g = objects.PBXGroup[key];
      return g && typeof g === "object" && g.name === appName;
    });

    if (appGroupKey) {
      const appGroup = objects.PBXGroup[appGroupKey];
      const alreadyAdded = appGroup.children?.some((c) => {
        const ref = objects.PBXFileReference?.[c.value];
        return (
          ref &&
          (ref.name === `"${iconFilename}"` || ref.name === iconFilename)
        );
      });
      if (!alreadyAdded) {
        appGroup.children.push({
          value: fileRefId,
          comment: iconFilename,
        });
      }
    }

    // ── Add PBXBuildFile + attach to Resources build phase ──
    const buildFileId = project.generateUuid();
    objects.PBXBuildFile = objects.PBXBuildFile || {};
    objects.PBXBuildFile[buildFileId] = {
      isa: "PBXBuildFile",
      fileRef: fileRefId,
      fileRef_comment: iconFilename,
    };
    objects.PBXBuildFile[`${buildFileId}_comment`] =
      `${iconFilename} in Resources`;

    // Find the main app target's Resources build phase
    const nativeTargets = objects.PBXNativeTarget || {};
    for (const targetKey of Object.keys(nativeTargets)) {
      const target = nativeTargets[targetKey];
      if (!target || typeof target !== "object") continue;
      if (
        target.productType !== '"com.apple.product-type.application"' &&
        target.productType !== "com.apple.product-type.application"
      )
        continue;

      // Find the PBXResourcesBuildPhase for this target
      for (const phaseRef of target.buildPhases || []) {
        const phase = objects.PBXResourcesBuildPhase?.[phaseRef.value];
        if (!phase || typeof phase !== "object" || !phase.files) continue;
        phase.files.push({
          value: buildFileId,
          comment: `${iconFilename} in Resources`,
        });
      }
    }

    console.log(`  › Added ${iconFilename} to Xcode project resources`);

    // ── Update build settings ──
    const buildConfigs = objects.XCBuildConfiguration;
    for (const key of Object.keys(buildConfigs)) {
      const bc = buildConfigs[key];
      if (!bc || typeof bc !== "object" || !bc.buildSettings) continue;

      if (bc.buildSettings.ASSETCATALOG_COMPILER_APPICON_NAME) {
        bc.buildSettings.ASSETCATALOG_COMPILER_APPICON_NAME = iconName;
        bc.buildSettings.ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS =
          "YES";
      }
    }
    console.log(`  › Set ASSETCATALOG_COMPILER_APPICON_NAME = ${iconName}`);

    return cfg;
  });

  return config;
}

module.exports = (config, props) => withIconComposerFile(config, props);
