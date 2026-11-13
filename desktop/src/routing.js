const DEFAULT_PAGES = Object.freeze({
  doctor: "dashboard",
  patient: "home",
});

const ALLOWED_PAGES = Object.freeze({
  doctor: new Set([
    "dashboard",
    "patients",
    "clinical",
    "notes",
    "appointments",
    "treatments",
    "billing",
    "files",
    "messages",
    "reports",
    "workspaces",
    "settings",
  ]),
  // The patient experience is public and account-free. Private records and
  // account pages are deliberately not routable in the patient browser surface.
  patient: new Set(["home", "booking"]),
});

export function resolvePortalRoute(pathname = "/") {
  const segments = String(pathname || "/")
    .split(/[?#]/, 1)[0]
    .split("/")
    .filter(Boolean);
  const requestedRole = segments[0];
  if (requestedRole && requestedRole !== "doctor" && requestedRole !== "patient") {
    return { role: "doctor", page: DEFAULT_PAGES.doctor };
  }
  const role = requestedRole === "patient" ? "patient" : "doctor";
  const candidate = segments[1] || DEFAULT_PAGES[role];
  const page = ALLOWED_PAGES[role].has(candidate)
    ? candidate
    : DEFAULT_PAGES[role];
  return { role, page };
}

export function portalPath(role, page) {
  const normalizedRole = role === "patient" ? "patient" : "doctor";
  const candidate = String(page || DEFAULT_PAGES[normalizedRole]);
  const safePage = ALLOWED_PAGES[normalizedRole].has(candidate)
    ? candidate
    : DEFAULT_PAGES[normalizedRole];
  return `/${normalizedRole}/${safePage}`;
}

export function createPortalNavigator(windowObject, onRouteChange) {
  if (
    !windowObject?.location ||
    !windowObject?.history?.pushState ||
    typeof windowObject.addEventListener !== "function" ||
    typeof windowObject.removeEventListener !== "function" ||
    typeof onRouteChange !== "function"
  ) {
    throw new TypeError("A browser window and route-change callback are required.");
  }

  const handlePopState = () => {
    onRouteChange(resolvePortalRoute(windowObject.location.pathname));
  };
  windowObject.addEventListener("popstate", handlePopState);

  return {
    navigate(role, page) {
      const path = portalPath(role, page);
      if (windowObject.location.pathname !== path) {
        windowObject.history.pushState({ oralynPortal: true }, "", path);
      }
    },
    dispose() {
      windowObject.removeEventListener("popstate", handlePopState);
    },
  };
}
