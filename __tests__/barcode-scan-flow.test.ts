/**
 * Barcode scan flow — static checks (Jest runs in Node; no RN renderer).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs") as typeof import("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path") as typeof import("path");

describe("Barcode scan flow — camera-log wiring (smoke)", () => {
  it("uses startFromBarcode + explicit lookup state (no legacy overlay)", () => {
    const cameraLog = fs.readFileSync(
      path.join(__dirname, "..", "app", "(modals)", "camera-log.tsx"),
      "utf8"
    );
    expect(cameraLog).toContain("looking_up_barcode");
    expect(cameraLog).toContain("startFromBarcode");
    expect(cameraLog).not.toContain("BarcodeLookupOverlay");
  });
});
