"use strict";

const HTTP_METHODS = new Set([
  "get", "post", "put", "patch", "delete", "options", "head", "trace",
]);

// Keep this method-specific allowlist aligned with the backend's
// tests/test_auth_security.py PUBLIC_PATHS. Every other documented dental
// operation must explicitly declare HTTP BearerAuth.
const PUBLIC_OPENAPI_OPERATIONS = new Set([
  "get /v1/dental/health",
  "post /v1/dental/auth/password/login",
  "post /v1/dental/assistant/auth/login",
  "post /v1/dental/public/appointments",
  "post /v1/dental/public/demo-requests",
  "get /v1/dental/billing/plans",
  "post /v1/dental/billing/razorpay/webhook",
]);

function inspectOpenApiBearerAuth(openapi) {
  const paths = openapi?.paths && typeof openapi.paths === "object"
    ? openapi.paths
    : {};
  const dentalOperations = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!path.startsWith("/v1/dental/") || !pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      const normalizedMethod = method.toLowerCase();
      if (!HTTP_METHODS.has(normalizedMethod) || !operation || typeof operation !== "object") {
        continue;
      }
      dentalOperations.push({ path, method: normalizedMethod, operation });
    }
  }

  const protectedOperations = dentalOperations.filter(({ path, method }) =>
    !PUBLIC_OPENAPI_OPERATIONS.has(method + " " + path)
  );
  const publicOperations = [...PUBLIC_OPENAPI_OPERATIONS].map((key) => {
    const separator = key.indexOf(" ");
    const method = key.slice(0, separator);
    const path = key.slice(separator + 1);
    return { path, method, operation: paths[path]?.[method] };
  });

  const bearerScheme = openapi?.components?.securitySchemes?.BearerAuth;
  const bearerSchemeConfigured = bearerScheme?.type === "http" &&
    String(bearerScheme?.scheme || "").toLowerCase() === "bearer";

  const hasBearerAuth = (operation) =>
    Array.isArray(operation?.security) &&
    operation.security.length > 0 &&
    // OpenAPI security entries are OR alternatives. Every alternative must
    // require BearerAuth; an empty {} entry would make the route anonymous.
    operation.security.every((entry) =>
      entry &&
      typeof entry === "object" &&
      Array.isArray(entry.BearerAuth)
    );

  const verifiedProtectedOperations = protectedOperations.filter(({ operation }) =>
    hasBearerAuth(operation)
  );
  const missingProtectedOperations = protectedOperations
    .filter(({ operation }) => !hasBearerAuth(operation))
    .map(({ method, path }) => method.toUpperCase() + " " + path);
  const missingPublicOperations = publicOperations
    .filter(({ operation }) => !operation)
    .map(({ method, path }) => method.toUpperCase() + " " + path);
  const securedPublicOperations = publicOperations
    .filter(({ operation }) =>
      Array.isArray(operation?.security) && operation.security.length > 0
    )
    .map(({ method, path }) => method.toUpperCase() + " " + path);

  const passed = bearerSchemeConfigured &&
    protectedOperations.length > 0 &&
    missingProtectedOperations.length === 0 &&
    missingPublicOperations.length === 0 &&
    securedPublicOperations.length === 0;

  return {
    passed,
    bearerSchemeConfigured,
    protectedOperationCount: protectedOperations.length,
    verifiedProtectedOperationCount: verifiedProtectedOperations.length,
    missingProtectedOperations,
    expectedPublicOperationCount: PUBLIC_OPENAPI_OPERATIONS.size,
    missingPublicOperations,
    securedPublicOperations,
  };
}

module.exports = {
  inspectOpenApiBearerAuth,
  PUBLIC_OPENAPI_OPERATIONS,
};
