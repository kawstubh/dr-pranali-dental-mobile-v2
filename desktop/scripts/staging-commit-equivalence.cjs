"use strict";

function isDocsOnlyCompare(compare) {
  if (
    !compare ||
    compare.status !== "ahead" ||
    compare.behind_by !== 0 ||
    !Number.isInteger(compare.ahead_by) ||
    compare.ahead_by < 1 ||
    compare.too_large === true ||
    !Array.isArray(compare.files) ||
    compare.files.length === 0
  ) {
    return false;
  }

  return compare.files.every((file) => {
    const filename = typeof file?.filename === "string" ? file.filename : "";
    if (!filename.startsWith("docs/") || !filename.endsWith(".md")) return false;
    return !filename.split("/").some((part) => !part || part === "." || part === "..");
  });
}

module.exports = { isDocsOnlyCompare };
