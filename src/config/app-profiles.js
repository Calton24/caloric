/**
 * App Profiles for Expo Config
 * Plain JS file so it can be require()'d by app.config.ts at build time
 *
 * This is a DUPLICATE of the TypeScript profiles for build-time use only.
 * The source of truth is still the TypeScript files in ./profiles/
 */

const APP_PROFILES = {
  default: {
    app: {
      name: "CalCut",
      slug: "caloric-dev",
      bundleIdentifier: "com.calton.caloric",
      androidPackage: "com.calton.caloric",
      version: "1.0.0",
      scheme: "caloric",
    },
    environments: {
      dev: {
        app: {
          name: "Caloric Dev",
          bundleIdentifier: "com.calton24.caloric.dev",
          androidPackage: "com.calton24.caloric.dev",
        },
      },
      staging: {
        app: {
          name: "Caloric Staging",
          bundleIdentifier: "com.calton24.caloric.staging",
          androidPackage: "com.calton24.caloric.staging",
        },
      },
      prod: {},
    },
  },

  caloric: {
    app: {
      name: "CalCut",
      slug: "caloric-dev",
      bundleIdentifier: "com.calton.caloric",
      androidPackage: "com.calton.caloric",
      version: "1.0.0",
      scheme: "caloric",
    },
    environments: {
      dev: {
        app: {
          name: "Caloric",
          bundleIdentifier: "com.calton24.caloric.dev",
          androidPackage: "com.calton24.caloric.dev",
        },
      },
      staging: {
        app: {
          name: "Caloric Staging",
          bundleIdentifier: "com.calton24.caloric.staging",
          androidPackage: "com.calton24.caloric.staging",
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
