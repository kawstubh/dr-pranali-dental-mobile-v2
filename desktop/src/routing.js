const DEFAULT_PAGES = Object.freeze({
  doctor: "dashboard",
});

const PUBLIC_PATIENT_PAGES = new Set(["home", "booking"]);

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
  if (requestedRole === "patient") {
    const candidate = segments[1] || "home";
    const page = PUBLIC_PATIENT_PAGES.has(candidate) ? candidate : "home";
    return {
      role: "doctor",
      page: DEFAULT_PAGES.doctor,
      redirectTo: `/patient/${page}/`,
    };
  }
  const candidate = segments[1] || DEFAULT_PAGES.doctor;
  const page = ALLOWED_PAGES.doctor.has(candidate)
    ? candidate
    : DEFAULT_PAGES.doctor;
  return { role: "doctor", page };
}

export function portalPath(role, page) {
  if (role === "patient") {
    const candidate = String(page || "home");
    const safePage = PUBLIC_PATIENT_PAGES.has(candidate) ? candidate : "home";
    return `/patient/${safePage}/`;
  }
  const candidate = String(page || DEFAULT_PAGES.doctor);
  const safePage = ALLOWED_PAGES.doctor.has(candidate)
    ? candidate
    : DEFAULT_PAGES.doctor;
  return `/doctor/${safePage}`;
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
    const route = resolvePortalRoute(windowObject.location.pathname);
    if (route.redirectTo) {
      if (windowObject.location.pathname !== route.redirectTo) {
        windowObject.location.assign?.(route.redirectTo);
      }
      return;
    }
    onRouteChange(route);
  };
  windowObject.addEventListener("popstate", handlePopState);

  return {
    navigate(role, page) {
      const path = portalPath(role, page);
      if (role === "patient") {
        windowObject.location.assign?.(path);
        return;
      }
      if (windowObject.location.pathname !== path) {
        windowObject.history.pushState({ oralynPortal: true }, "", path);
      }
    },
    dispose() {
      windowObject.removeEventListener("popstate", handlePopState);
    },
  };
}
