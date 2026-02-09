/**
 * App Profiles for Expo Config
 * Plain JS file so it can be require()'d by app.config.ts at build time
 *
 * This is a DUPLICATE of the TypeScript profiles for build-time use only.
 * The source of truth is still the TypeScript files in ./profiles/
 */

const APP_PROFILES = {
  intake: {
    app: {
      name: "Intake",
      slug: "intake-mobile",
      bundleIdentifier: "com.yourcompany.intake",
      androidPackage: "com.yourcompany.intake",
      version: "1.0.0",
      scheme: "intake",
    },
    environments: {
      dev: {
        app: {
          name: "Intake Dev",
          slug: "intake-app-dev",
          bundleIdentifier: "com.yourcompany.intake.dev",
          androidPackage: "com.yourcompany.intake.dev",
        },
      },
      staging: {
        app: {
          name: "Intake Staging",
          bundleIdentifier: "com.yourcompany.intake.staging",
          androidPackage: "com.yourcompany.intake.staging",
        },
      },
      prod: {},
    },
  },

  proxi: {
    app: {
      name: "Proxi",
      slug: "proxi-mobile",
      bundleIdentifier: "com.yourcompany.proxi",
      androidPackage: "com.yourcompany.proxi",
      version: "1.0.0",
      scheme: "proxi",
    },
    environments: {
      dev: {
        app: {
          name: "Proxi Dev",
          slug: "proxi-app-dev",
          bundleIdentifier: "com.yourcompany.proxi.dev",
          androidPackage: "com.yourcompany.proxi.dev",
        },
      },
      staging: {
        app: {
          name: "Proxi Staging",
          bundleIdentifier: "com.yourcompany.proxi.staging",
          androidPackage: "com.yourcompany.proxi.staging",
        },
      },
      prod: {},
    },
  },
};

module.exports = { APP_PROFILES };
