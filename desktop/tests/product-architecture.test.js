import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(process.cwd(), "..");
const rootPackage = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
const portalPackage = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
const readme = fs.readFileSync(path.join(repositoryRoot, "README.md"), "utf8");

const retiredRuntimePackages = [
  "expo",
  "react-native",
  "@react-native-google-signin/google-signin",
  "@supabase/supabase-js",
  "react-native-url-polyfill",
];

function declaredPackages(manifest) {
  return {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.optionalDependencies,
  };
}

test("root workspace is a web-portal entry point, not a native app package", () => {
  assert.equal(rootPackage.name, "oralyn-web-portal-workspace");
  assert.equal(rootPackage.main, undefined);
  assert.equal(rootPackage.scripts?.android, undefined);
  assert.equal(rootPackage.scripts?.ios, undefined);
  assert.deepEqual(
    retiredRuntimePackages.filter((name) => declaredPackages(rootPackage)[name]),
    [],
  );
});

test("active desktop package has no native runtime or patient-auth dependency", () => {
  assert.equal(portalPackage.name, "oralyn-desktop");
  assert.deepEqual(
    retiredRuntimePackages.filter((name) => declaredPackages(portalPackage)[name]),
    [],
  );
});

test("root build and test commands delegate to the active portal", () => {
  assert.match(rootPackage.scripts?.build || "", /npm ci --prefix desktop/);
  assert.match(rootPackage.scripts?.build || "", /npm run build --prefix desktop/);
  assert.match(rootPackage.scripts?.test || "", /npm test --prefix desktop/);
});

test("repository documentation describes the responsive web portal as the only product", () => {
  assert.match(readme, /one responsive browser-based portal/i);
  assert.match(readme, /Native Android\/iOS applications and APKs are not part of this product/i);
  assert.match(readme, /no patient accounts, passwords, OTP, signup\/login or Supabase patient authentication/i);
  assert.doesNotMatch(readme, /React Native \/ Expo patient application/i);
});
