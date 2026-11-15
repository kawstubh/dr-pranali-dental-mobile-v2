"use strict";

function isRuntimeEquivalentCompare(compare) {
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
    if (!filename || filename.startsWith("/") || filename.includes("\\")) return false;
    const parts = filename.split("/");
    if (parts.some((part) => !part || part === "." || part === "..")) return false;

    const root = parts[0];
    const extension = parts[parts.length - 1].toLowerCase();
    return (root === "docs" && extension.endsWith(".md")) ||
      (root === "tests" && extension.endsWith(".py"));
  });
}

module.exports = { isRuntimeEquivalentCompare };
