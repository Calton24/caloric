/**
 * withLiveActivity — Expo Config Plugin
 *
 * Adds a WidgetKit extension target to the Xcode project so Live Activities
 * appear in the Dynamic Island and on the Lock Screen.
 *
 * What it does during `npx expo prebuild`:
 *   1. Sets NSSupportsLiveActivities = true in the main app's Info.plist
 *   2. Copies Swift widget sources into ios/MobileCoreWidget/
 *   3. Creates a new "MobileCoreWidget" app-extension target in the Xcode project
 *   4. Configures build settings, embed phase, and framework dependencies
 *
 * Uses direct PBX hash manipulation for reliability — the `xcode` library's
 * high-level APIs have edge-case bugs with app extension targets.
 */

const {
  withInfoPlist,
  withXcodeProject,
  withDangerousMod,
  withEntitlementsPlist,
} = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const WIDGET_NAME = "MobileCoreWidget";

// Swift source files for the widget extension
const WIDGET_SWIFT_FILES = [
  "MobileCoreActivity.swift",
  "MobileCoreWidgetBundle.swift",
  "MobileCoreWidgetLiveActivity.swift",
  "FitnessLiveActivity.swift",
  "PedometerLiveActivity.swift",
  "CalorieBudgetLiveActivity.swift",
];

// ────────────────────────────────────────────────────────
// 1. Info.plist — enable Live Activities in the main app
// ────────────────────────────────────────────────────────
function withLiveActivityInfoPlist(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true;
    return mod;
  });
}

// ────────────────────────────────────────────────────────
// 2. Entitlements — push notifications for remote updates
// ────────────────────────────────────────────────────────
function withLiveActivityEntitlements(config) {
  return withEntitlementsPlist(config, (mod) => {
    mod.modResults["aps-environment"] =
      mod.modResults["aps-environment"] || "development";
    return mod;
  });
}

// ────────────────────────────────────────────────────────
// 3. Copy widget extension Swift files to ios/
// ────────────────────────────────────────────────────────
function withWidgetFiles(config) {
  return withDangerousMod(config, [
    "ios",
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const widgetDir = path.join(projectRoot, "ios", WIDGET_NAME);
      const sourceDir = path.join(
        projectRoot,
        "plugins",
        "live-activity-widget"
      );

      fs.mkdirSync(widgetDir, { recursive: true });

      const allFiles = [...WIDGET_SWIFT_FILES, "Info.plist"];
      for (const file of allFiles) {
        const src = path.join(sourceDir, file);
        const dest = path.join(widgetDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        } else {
          console.warn(`[withLiveActivity] Source not found: ${src}`);
        }
      }

      console.log(
        `[withLiveActivity] Copied ${allFiles.length} files → ${widgetDir}`
      );
      return mod;
    },
  ]);
}

// ────────────────────────────────────────────────────────
// 4. Xcode project — add widget extension target
// ────────────────────────────────────────────────────────
function withWidgetTarget(config) {
  return withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const objects = proj.hash.project.objects;
    const appName = mod.modRequest.projectName;

    // Bail if already exists
    const nativeTargets = objects["PBXNativeTarget"] || {};
    for (const key in nativeTargets) {
      if (key.endsWith("_comment")) continue;
      if (nativeTargets[key]?.name === WIDGET_NAME) {
        console.log(`[withLiveActivity] Target "${WIDGET_NAME}" exists, skip.`);
        return mod;
      }
    }

    // Resolve main app bundle ID and dev team
    const mainBundleId = resolveMainBundleId(objects, appName);
    const widgetBundleId = `${mainBundleId}.${WIDGET_NAME}`;
    const devTeam = resolveDevTeam(objects);

    // ── PBXFileReference for each Swift file ──
    const fileRefUuids = {};
    objects["PBXFileReference"] = objects["PBXFileReference"] || {};
    for (const file of WIDGET_SWIFT_FILES) {
      const uuid = proj.generateUuid();
      objects["PBXFileReference"][uuid] = {
        isa: "PBXFileReference",
        lastKnownFileType: "sourcecode.swift",
        path: file,
        sourceTree: '"<group>"',
        fileEncoding: 4,
      };
      objects["PBXFileReference"][`${uuid}_comment`] = file;
      fileRefUuids[file] = uuid;
    }

    // Info.plist file ref
    const infoPlistRefUuid = proj.generateUuid();
    objects["PBXFileReference"][infoPlistRefUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "text.plist.xml",
      path: "Info.plist",
      sourceTree: '"<group>"',
    };
    objects["PBXFileReference"][`${infoPlistRefUuid}_comment`] = "Info.plist";

    // .appex product ref
    const appexRefUuid = proj.generateUuid();
    objects["PBXFileReference"][appexRefUuid] = {
      isa: "PBXFileReference",
      explicitFileType: '"wrapper.app-extension"',
      includeInIndex: 0,
      path: `${WIDGET_NAME}.appex`,
      sourceTree: "BUILT_PRODUCTS_DIR",
    };
    objects["PBXFileReference"][`${appexRefUuid}_comment`] =
      `${WIDGET_NAME}.appex`;

    // ── PBXGroup for widget files ──
    const groupUuid = proj.generateUuid();
    const groupChildren = WIDGET_SWIFT_FILES.map((f) => ({
      value: fileRefUuids[f],
      comment: f,
    }));
    groupChildren.push({ value: infoPlistRefUuid, comment: "Info.plist" });

    objects["PBXGroup"] = objects["PBXGroup"] || {};
    objects["PBXGroup"][groupUuid] = {
      isa: "PBXGroup",
      children: groupChildren,
      path: WIDGET_NAME,
      sourceTree: '"<group>"',
    };
    objects["PBXGroup"][`${groupUuid}_comment`] = WIDGET_NAME;

    // Add to main project group
    const mainGroupUuid = proj.getFirstProject().firstProject.mainGroup;
    const mainGroup = objects["PBXGroup"][mainGroupUuid];
    if (mainGroup?.children) {
      mainGroup.children.push({ value: groupUuid, comment: WIDGET_NAME });
    }

    // Add product to Products group
    const productsGroupKey = findProductsGroup(objects);
    if (productsGroupKey) {
      objects["PBXGroup"][productsGroupKey].children.push({
        value: appexRefUuid,
        comment: `${WIDGET_NAME}.appex`,
      });
    }

    // ── PBXBuildFile for Sources ──
    const buildFileUuids = {};
    objects["PBXBuildFile"] = objects["PBXBuildFile"] || {};
    for (const file of WIDGET_SWIFT_FILES) {
      const uuid = proj.generateUuid();
      objects["PBXBuildFile"][uuid] = {
        isa: "PBXBuildFile",
        fileRef: fileRefUuids[file],
        fileRef_comment: file,
      };
      objects["PBXBuildFile"][`${uuid}_comment`] = `${file} in Sources`;
      buildFileUuids[file] = uuid;
    }

    // ── Sources build phase ──
    const sourcesBPUuid = proj.generateUuid();
    objects["PBXSourcesBuildPhase"] = objects["PBXSourcesBuildPhase"] || {};
    objects["PBXSourcesBuildPhase"][sourcesBPUuid] = {
      isa: "PBXSourcesBuildPhase",
      buildActionMask: 2147483647,
      files: WIDGET_SWIFT_FILES.map((f) => ({
        value: buildFileUuids[f],
        comment: `${f} in Sources`,
      })),
      runOnlyForDeploymentPostprocessing: 0,
    };
    objects["PBXSourcesBuildPhase"][`${sourcesBPUuid}_comment`] = "Sources";

    // ── Frameworks build phase (WidgetKit + SwiftUI) ──
    const widgetKitRefUuid = proj.generateUuid();
    objects["PBXFileReference"][widgetKitRefUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "wrapper.framework",
      name: "WidgetKit.framework",
      path: "System/Library/Frameworks/WidgetKit.framework",
      sourceTree: "SDKROOT",
    };
    objects["PBXFileReference"][`${widgetKitRefUuid}_comment`] =
      "WidgetKit.framework";

    const swiftUIRefUuid = proj.generateUuid();
    objects["PBXFileReference"][swiftUIRefUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "wrapper.framework",
      name: "SwiftUI.framework",
      path: "System/Library/Frameworks/SwiftUI.framework",
      sourceTree: "SDKROOT",
    };
    objects["PBXFileReference"][`${swiftUIRefUuid}_comment`] =
      "SwiftUI.framework";

    const wkBuildFileUuid = proj.generateUuid();
    objects["PBXBuildFile"][wkBuildFileUuid] = {
      isa: "PBXBuildFile",
      fileRef: widgetKitRefUuid,
      fileRef_comment: "WidgetKit.framework",
    };
    objects["PBXBuildFile"][`${wkBuildFileUuid}_comment`] =
      "WidgetKit.framework in Frameworks";

    const suiBuildFileUuid = proj.generateUuid();
    objects["PBXBuildFile"][suiBuildFileUuid] = {
      isa: "PBXBuildFile",
      fileRef: swiftUIRefUuid,
      fileRef_comment: "SwiftUI.framework",
    };
    objects["PBXBuildFile"][`${suiBuildFileUuid}_comment`] =
      "SwiftUI.framework in Frameworks";

    const frameworksBPUuid = proj.generateUuid();
    objects["PBXFrameworksBuildPhase"] =
      objects["PBXFrameworksBuildPhase"] || {};
    objects["PBXFrameworksBuildPhase"][frameworksBPUuid] = {
      isa: "PBXFrameworksBuildPhase",
      buildActionMask: 2147483647,
      files: [
        {
          value: wkBuildFileUuid,
          comment: "WidgetKit.framework in Frameworks",
        },
        {
          value: suiBuildFileUuid,
          comment: "SwiftUI.framework in Frameworks",
        },
      ],
      runOnlyForDeploymentPostprocessing: 0,
    };
    objects["PBXFrameworksBuildPhase"][`${frameworksBPUuid}_comment`] =
      "Frameworks";

    // Resources (empty)
    const resourcesBPUuid = proj.generateUuid();
    objects["PBXResourcesBuildPhase"] =
      objects["PBXResourcesBuildPhase"] || {};
    objects["PBXResourcesBuildPhase"][resourcesBPUuid] = {
      isa: "PBXResourcesBuildPhase",
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    objects["PBXResourcesBuildPhase"][`${resourcesBPUuid}_comment`] =
      "Resources";

    // ── Build configurations ──
    const debugConfigUuid = proj.generateUuid();
    const releaseConfigUuid = proj.generateUuid();
    const configListUuid = proj.generateUuid();

    const sharedSettings = {
      ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: '"AccentColor"',
      ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: '"WidgetBackground"',
      CODE_SIGN_STYLE: "Automatic",
      CURRENT_PROJECT_VERSION: '"1"',
      DEVELOPMENT_TEAM: devTeam,
      GENERATE_INFOPLIST_FILE: "YES",
      INFOPLIST_FILE: `"${WIDGET_NAME}/Info.plist"`,
      IPHONEOS_DEPLOYMENT_TARGET: "16.2",
      LD_RUNPATH_SEARCH_PATHS:
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      MARKETING_VERSION: '"1.0"',
      PRODUCT_BUNDLE_IDENTIFIER: `"${widgetBundleId}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SKIP_INSTALL: "YES",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: '"1,2"',
    };

    objects["XCBuildConfiguration"] = objects["XCBuildConfiguration"] || {};
    objects["XCBuildConfiguration"][debugConfigUuid] = {
      isa: "XCBuildConfiguration",
      buildSettings: { ...sharedSettings, DEBUG_INFORMATION_FORMAT: '"dwarf"' },
      name: "Debug",
    };
    objects["XCBuildConfiguration"][`${debugConfigUuid}_comment`] = "Debug";

    objects["XCBuildConfiguration"][releaseConfigUuid] = {
      isa: "XCBuildConfiguration",
      buildSettings: {
        ...sharedSettings,
        DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
        COPY_PHASE_STRIP: "NO",
      },
      name: "Release",
    };
    objects["XCBuildConfiguration"][`${releaseConfigUuid}_comment`] = "Release";

    objects["XCConfigurationList"] = objects["XCConfigurationList"] || {};
    objects["XCConfigurationList"][configListUuid] = {
      isa: "XCConfigurationList",
      buildConfigurations: [
        { value: debugConfigUuid, comment: "Debug" },
        { value: releaseConfigUuid, comment: "Release" },
      ],
      defaultConfigurationIsVisible: 0,
      defaultConfigurationName: "Release",
    };
    objects["XCConfigurationList"][`${configListUuid}_comment`] =
      `Build configuration list for PBXNativeTarget "${WIDGET_NAME}"`;

    // ── PBXNativeTarget ──
    const targetUuid = proj.generateUuid();
    objects["PBXNativeTarget"] = objects["PBXNativeTarget"] || {};
    objects["PBXNativeTarget"][targetUuid] = {
      isa: "PBXNativeTarget",
      buildConfigurationList: configListUuid,
      buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${WIDGET_NAME}"`,
      buildPhases: [
        { value: sourcesBPUuid, comment: "Sources" },
        { value: frameworksBPUuid, comment: "Frameworks" },
        { value: resourcesBPUuid, comment: "Resources" },
      ],
      buildRules: [],
      dependencies: [],
      name: WIDGET_NAME,
      productName: WIDGET_NAME,
      productReference: appexRefUuid,
      productReference_comment: `${WIDGET_NAME}.appex`,
      productType: '"com.apple.product-type.app-extension"',
    };
    objects["PBXNativeTarget"][`${targetUuid}_comment`] = WIDGET_NAME;

    // Add target to PBXProject targets
    const projectSection = objects["PBXProject"];
    for (const key in projectSection) {
      if (key.endsWith("_comment")) continue;
      const projectObj = projectSection[key];
      if (projectObj?.targets) {
        projectObj.targets.push({ value: targetUuid, comment: WIDGET_NAME });
      }
    }

    // ── Embed extension in main app ──
    const mainTargetUuid = findMainTarget(objects, appName);
    if (mainTargetUuid) {
      const embedBFUuid = proj.generateUuid();
      objects["PBXBuildFile"][embedBFUuid] = {
        isa: "PBXBuildFile",
        fileRef: appexRefUuid,
        fileRef_comment: `${WIDGET_NAME}.appex`,
        settings: { ATTRIBUTES: ["RemoveHeadersOnCopy"] },
      };
      objects["PBXBuildFile"][`${embedBFUuid}_comment`] =
        `${WIDGET_NAME}.appex in Embed App Extensions`;

      const embedPhaseUuid = proj.generateUuid();
      objects["PBXCopyFilesBuildPhase"] =
        objects["PBXCopyFilesBuildPhase"] || {};
      objects["PBXCopyFilesBuildPhase"][embedPhaseUuid] = {
        isa: "PBXCopyFilesBuildPhase",
        buildActionMask: 2147483647,
        dstPath: '""',
        dstSubfolderSpec: 13,
        files: [
          {
            value: embedBFUuid,
            comment: `${WIDGET_NAME}.appex in Embed App Extensions`,
          },
        ],
        name: '"Embed App Extensions"',
        runOnlyForDeploymentPostprocessing: 0,
      };
      objects["PBXCopyFilesBuildPhase"][`${embedPhaseUuid}_comment`] =
        "Embed App Extensions";

      const mainTarget = objects["PBXNativeTarget"][mainTargetUuid];
      if (mainTarget?.buildPhases) {
        mainTarget.buildPhases.push({
          value: embedPhaseUuid,
          comment: "Embed App Extensions",
        });
      }

      // Target dependency
      const proxyUuid = proj.generateUuid();
      objects["PBXContainerItemProxy"] =
        objects["PBXContainerItemProxy"] || {};
      objects["PBXContainerItemProxy"][proxyUuid] = {
        isa: "PBXContainerItemProxy",
        containerPortal: proj.hash.project.rootObject,
        containerPortal_comment: "Project object",
        proxyType: 1,
        remoteGlobalIDString: targetUuid,
        remoteInfo: `"${WIDGET_NAME}"`,
      };
      objects["PBXContainerItemProxy"][`${proxyUuid}_comment`] =
        "PBXContainerItemProxy";

      const depUuid = proj.generateUuid();
      objects["PBXTargetDependency"] = objects["PBXTargetDependency"] || {};
      objects["PBXTargetDependency"][depUuid] = {
        isa: "PBXTargetDependency",
        target: targetUuid,
        target_comment: WIDGET_NAME,
        targetProxy: proxyUuid,
        targetProxy_comment: "PBXContainerItemProxy",
      };
      objects["PBXTargetDependency"][`${depUuid}_comment`] =
        "PBXTargetDependency";

      if (mainTarget?.dependencies) {
        mainTarget.dependencies.push({
          value: depUuid,
          comment: "PBXTargetDependency",
        });
      }
    }

    console.log(
      `[withLiveActivity] Created widget target: ${WIDGET_NAME} (${widgetBundleId})`
    );

    return mod;
  });
}

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

function resolveMainBundleId(objects, appName) {
  const configs = objects["XCBuildConfiguration"] || {};
  for (const key in configs) {
    if (key.endsWith("_comment")) continue;
    const cfg = configs[key];
    if (cfg?.buildSettings) {
      const name = cfg.buildSettings.PRODUCT_NAME;
      if (
        name &&
        (name === `"${appName}"` || name === appName) &&
        cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER
      ) {
        return cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER.replace(/"/g, "");
      }
    }
  }
  for (const key in configs) {
    if (key.endsWith("_comment")) continue;
    const bid = configs[key]?.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER;
    if (bid && !bid.includes("$(")) return bid.replace(/"/g, "");
  }
  return "com.calton24.mobilecore";
}

function resolveDevTeam(objects) {
  const configs = objects["XCBuildConfiguration"] || {};
  for (const key in configs) {
    if (key.endsWith("_comment")) continue;
    const team = configs[key]?.buildSettings?.DEVELOPMENT_TEAM;
    if (team && team !== '""' && team !== "") return team;
  }
  return '""';
}

function findMainTarget(objects, appName) {
  const targets = objects["PBXNativeTarget"] || {};
  for (const key in targets) {
    if (key.endsWith("_comment")) continue;
    if (targets[key]?.name === appName) return key;
  }
  return null;
}

function findProductsGroup(objects) {
  const groups = objects["PBXGroup"] || {};
  for (const key in groups) {
    if (key.endsWith("_comment")) continue;
    if (groups[key]?.name === "Products") return key;
  }
  return null;
}

// ────────────────────────────────────────────────────────
// Main plugin
// ────────────────────────────────────────────────────────

function withLiveActivity(config) {
  config = withLiveActivityInfoPlist(config);
  config = withLiveActivityEntitlements(config);
  config = withWidgetFiles(config);
  config = withWidgetTarget(config);
  return config;
}

module.exports = withLiveActivity;
