export function createControllerChangeHandler(serviceWorker, reload) {
  if (!serviceWorker || typeof reload !== "function") {
    throw new TypeError("A service worker container and reload callback are required.");
  }

  let previousController = serviceWorker.controller || null;
  let reloadRequested = false;

  return () => {
    const currentController = serviceWorker.controller || null;
    if (!currentController || currentController === previousController) return;

    const hadPreviousController = Boolean(previousController);
    previousController = currentController;
    if (!hadPreviousController || reloadRequested) return;

    reloadRequested = true;
    reload();
  };
}
