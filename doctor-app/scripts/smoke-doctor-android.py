#!/usr/bin/env python3
"""Authenticated Android smoke test for synthetic staging Doctor accounts only.

This test never creates, edits or deletes clinical records. It captures screenshots
only when the caller explicitly marks the staging dataset as synthetic.
"""
from __future__ import annotations

import os
import re
import shlex
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

ADB = os.environ.get("ADB", "adb")
PACKAGE = "com.drpranali.dental.doctor"
EVIDENCE = Path(os.environ.get("DOCTOR_EVIDENCE", "build-evidence"))
EVIDENCE.mkdir(parents=True, exist_ok=True)


def run_adb(*args: str, timeout: int = 45, check: bool = True) -> str:
    result = subprocess.run(
        [ADB, *args], capture_output=True, text=True, timeout=timeout
    )
    if check and result.returncode:
        detail = (result.stderr or result.stdout or "ADB command failed").strip()
        raise RuntimeError(f"ADB {args[0]} failed: {detail[-700:]}")
    return result.stdout


def shell(command: str, check: bool = True) -> str:
    return run_adb("shell", command, check=check)


def bounds_center(node: ET.Element) -> tuple[int, int] | None:
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.attrib.get("bounds", ""))
    if not match:
        return None
    x1, y1, x2, y2 = map(int, match.groups())
    return ((x1 + x2) // 2, (y1 + y2) // 2)


def dump_ui(name: str) -> ET.Element:
    remote = f"/sdcard/{name}.xml"
    local = EVIDENCE / f"{name}.xml"
    shell(f"uiautomator dump {remote}")
    run_adb("pull", remote, str(local))
    return ET.parse(local).getroot()


def capture(name: str) -> ET.Element:
    remote = f"/sdcard/{name}.png"
    local = EVIDENCE / f"{name}.png"
    shell(f"screencap -p {remote}")
    run_adb("pull", remote, str(local))
    return dump_ui(name)


def node_text(node: ET.Element) -> str:
    return " ".join(
        value.strip()
        for child in node.iter("node")
        for value in (child.attrib.get("text", ""), child.attrib.get("content-desc", ""))
        if value and value.strip()
    )


def texts(root: ET.Element) -> list[str]:
    return [
        value.strip()
        for node in root.iter("node")
        for value in (node.attrib.get("text", ""), node.attrib.get("content-desc", ""))
        if value and value.strip()
    ]


def tap_node(node: ET.Element) -> None:
    point = bounds_center(node)
    if not point:
        raise RuntimeError("Could not locate a tappable Android UI element.")
    shell(f"input tap {point[0]} {point[1]}")
    time.sleep(0.7)


def tap_text(root: ET.Element, label: str, *, bottom: bool = False) -> None:
    matches = [
        node for node in root.iter("node")
        if node.attrib.get("text", "").strip() == label
        or node.attrib.get("content-desc", "").strip() == label
    ]
    if not matches:
        raise RuntimeError(f"Expected Doctor UI navigation/control was not found: {label}")
    if bottom:
        node = max(matches, key=lambda item: (bounds_center(item) or (0, 0))[1])
    else:
        node = min(matches, key=lambda item: (bounds_center(item) or (0, 0))[1])
    tap_node(node)


def wait_for(predicate, description: str, timeout: int = 55) -> ET.Element:
    deadline = time.monotonic() + timeout
    last_root = None
    while time.monotonic() < deadline:
        last_root = dump_ui("doctor-wait")
        current = texts(last_root)
        if predicate(current):
            return last_root
        if "Sign-in failed" in current:
            raise RuntimeError("Doctor staging sign-in failed; credentials or account state are invalid.")
        time.sleep(1.5)
    current = texts(last_root) if last_root is not None else []
    raise RuntimeError(f"Timed out waiting for {description}. Visible UI text: {current[:45]}")


def edit_field(root: ET.Element, password: bool) -> ET.Element:
    candidates = [
        node for node in root.iter("node")
        if node.attrib.get("class") == "android.widget.EditText"
        and node.attrib.get("password", "false").lower() == str(password).lower()
    ]
    if not candidates:
        raise RuntimeError("Doctor login input field was not present in the Android UI hierarchy.")
    return candidates[0]


def type_text(value: str) -> None:
    # Android's input command uses %s to represent spaces. shlex quoting keeps
    # punctuation in the synthetic account password from becoming shell syntax.
    encoded = value.replace(" ", "%s")
    shell(f"input text {shlex.quote(encoded)}")


def sign_in(email: str, password: str, label: str) -> ET.Element:
    root = wait_for(
        lambda values: "Sign in with your clinic-issued email and password." in values,
        f"{label} Doctor login screen",
    )
    tap_node(edit_field(root, password=False))
    type_text(email)
    shell("input keyevent 4", check=False)
    root = dump_ui(f"{label}-email-entered")
    tap_node(edit_field(root, password=True))
    type_text(password)
    shell("input keyevent 4", check=False)
    root = dump_ui(f"{label}-password-entered")
    tap_text(root, "Sign in securely")
    root = wait_for(
        lambda values: "Today's workspace" in values or "Choose a workspace" in values,
        f"{label} authenticated Doctor dashboard/workspace selection",
        timeout=75,
    )
    if "Choose a workspace" in texts(root):
        capture(f"doctor-{label}-workspace-selection")
        cards = []
        for node in root.iter("node"):
            if node.attrib.get("clickable") != "true" or not bounds_center(node):
                continue
            content = node_text(node)
            if content and "Sign out" not in content and "Return to current workspace" not in content:
                point = bounds_center(node)
                if point and point[1] > 300:
                    cards.append((point[1], node))
        if not cards:
            raise RuntimeError("Workspace selection screen rendered without a selectable workspace card.")
        tap_node(min(cards, key=lambda item: item[0])[1])
        root = wait_for(
            lambda values: "Today's workspace" in values,
            f"{label} selected workspace dashboard",
            timeout=60,
        )
    if "Today's workspace" not in texts(root):
        raise RuntimeError("Doctor dashboard did not render an active workspace.")
    return root


def navigate(root: ET.Element, label: str, expected: tuple[str, ...], name: str) -> ET.Element:
    tap_text(root, label, bottom=True)
    root = wait_for(
        lambda values: any(any(fragment.lower() in value.lower() for value in values) for fragment in expected),
        f"{name} screen",
    )
    return capture(name)


def first_patient_card(root: ET.Element) -> ET.Element | None:
    excluded = {
        "Patients", "No patients yet", "Patient list unavailable", "Search patients",
        "Refresh", "Home", "Appointments", "Clinical AI", "Clinical intelligence",
        "Sign out", "Add patient", "Patient records and charts",
    }
    candidates = []
    for node in root.iter("node"):
        if node.attrib.get("clickable") != "true" or not bounds_center(node):
            continue
        content = node_text(node)
        if not content or any(item in content for item in excluded):
            continue
        point = bounds_center(node)
        if point and point[1] > 350:
            candidates.append((point[1], node))
    return min(candidates, key=lambda item: item[0])[1] if candidates else None


def logout_to_login() -> None:
    root = dump_ui("doctor-before-logout")
    tap_text(root, "Sign out", bottom=False)
    wait_for(
        lambda values: "Sign in with your clinic-issued email and password." in values,
        "Doctor sign-out",
        timeout=35,
    )


def test_account(label: str, email: str, password: str, mode: str) -> dict[str, str]:
    root = sign_in(email, password, label)
    capture(f"doctor-{label}-dashboard")
    workspace_text = next((value for value in texts(root) if value not in {"Today's workspace", "Live clinic data"}), "")

    appointments = navigate(
        root, "Appointments",
        ("Appointment Queue", "No appointments yet", "Appointments unavailable"),
        f"doctor-{label}-appointments",
    )
    appointment_text = texts(appointments)
    empty_appointments = any("No appointments yet" in value for value in appointment_text)

    patients = navigate(
        appointments, "Patients",
        ("Patients", "No patients yet", "Patient list unavailable"),
        f"doctor-{label}-patients",
    )
    patient_text = texts(patients)
    empty_patients = any("No patients yet" in value for value in patient_text)

    if mode == "empty" and not (empty_appointments and empty_patients):
        raise RuntimeError("The designated empty Doctor account contains patients or appointments.")
    if mode == "populated" and (empty_appointments or empty_patients):
        raise RuntimeError("The designated populated Doctor account lacks a patient or appointment test record.")

    if mode == "populated":
        card = first_patient_card(patients)
        if card is None:
            raise RuntimeError("A synthetic populated Doctor account had no selectable patient card.")
        tap_node(card)
        chart = wait_for(
            lambda values: any("Dental chart" in value or "No dental chart findings are recorded yet" in value or "Chart could not be loaded" in value for value in values),
            "selected patient dental chart",
        )
        capture(f"doctor-{label}-chart")

    clinical = navigate(
        patients, "Clinical AI",
        ("Clinical intelligence", "AI DENTAL COMMAND CENTER"),
        f"doctor-{label}-clinical-intelligence",
    )

    # Verify that the same workspace is restored after a cold app restart.
    run_adb("shell", "am force-stop", PACKAGE)
    run_adb("shell", "monkey", "-p", PACKAGE, "1")
    restored = wait_for(
        lambda values: "Today's workspace" in values,
        f"{label} persisted Doctor session",
        timeout=60,
    )
    restored_workspace = next((value for value in texts(restored) if value not in {"Today's workspace", "Live clinic data"}), "")
    if workspace_text and restored_workspace and workspace_text != restored_workspace:
        raise RuntimeError("The active clinic workspace changed after the Doctor session was restored.")
    capture(f"doctor-{label}-session-restored")

    management = "not_visible"
    home = navigate(restored, "Home", ("Today's workspace",), f"doctor-{label}-home")
    if any("Workspace management" in value for value in texts(home)):
        management = "visible"
        capture(f"doctor-{label}-workspace-management")

    return {
        "account": label,
        "data_mode": mode,
        "patients_empty": str(empty_patients).lower(),
        "appointments_empty": str(empty_appointments).lower(),
        "workspace_persisted": "true",
        "workspace_management": management,
    }


def test_offline_error_state() -> None:
    root = dump_ui("doctor-before-offline")
    if "Home" not in texts(root):
        tap_text(root, "Home", bottom=True)
        root = wait_for(lambda values: "Today's workspace" in values, "Doctor home before offline test")
    shell("svc wifi disable", check=False)
    shell("svc data disable", check=False)
    shell("settings put global airplane_mode_on 1", check=False)
    shell("am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true", check=False)
    try:
        shell("input swipe 520 430 520 1450 650")
        root = wait_for(
            lambda values: any(
                phrase in value.lower()
                for value in values
                for phrase in ("unavailable", "could not be loaded", "did not respond", "could not load")
            ),
            "visible Doctor API/network error state",
            timeout=45,
        )
        capture("doctor-offline-error-state")
    finally:
        shell("settings put global airplane_mode_on 0", check=False)
        shell("am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false", check=False)
        shell("svc wifi enable", check=False)
        shell("svc data enable", check=False)
    time.sleep(5)
    root = dump_ui("doctor-before-retry")
    shell("input swipe 520 430 520 1450 650")
    wait_for(lambda values: "Today's workspace" in values, "Doctor dashboard after network recovery", timeout=60)
    capture("doctor-network-recovered")


def main() -> int:
    email = os.environ.get("DENTAL_STAGING_DOCTOR_EMAIL", "")
    password = os.environ.get("DENTAL_STAGING_DOCTOR_PASSWORD", "")
    dataset = os.environ.get("DENTAL_STAGING_DOCTOR_TEST_DATASET", "").lower()
    empty_email = os.environ.get("DENTAL_STAGING_DOCTOR_EMPTY_EMAIL", "")
    empty_password = os.environ.get("DENTAL_STAGING_DOCTOR_EMPTY_PASSWORD", "")
    empty_dataset = os.environ.get("DENTAL_STAGING_DOCTOR_EMPTY_DATASET", "").lower()

    if not email or not password or dataset != "synthetic":
        (EVIDENCE / "doctor-authenticated-result.txt").write_text(
            "authenticated_runtime=skipped\nreason=synthetic_staging_doctor_credentials_and_dataset_marker_required\n"
            "empty_account=not_run\nsession_persistence=not_verified\napi_error_state=not_verified\n",
            encoding="utf-8",
        )
        print("Authenticated Doctor runtime test skipped: add synthetic staging credentials and dataset marker.")
        return 0

    results = [test_account("populated", email, password, "populated")]
    test_offline_error_state()

    if empty_email and empty_password and empty_dataset == "synthetic":
        logout_to_login()
        results.append(test_account("empty", empty_email, empty_password, "empty"))
    else:
        results.append({"account": "empty", "result": "not_configured"})

    lines = ["authenticated_runtime=passed"]
    for item in results:
        lines.extend(f"{key}={value}" for key, value in item.items())
    (EVIDENCE / "doctor-authenticated-result.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Authenticated Doctor Android runtime checks passed for the configured synthetic account(s).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        (EVIDENCE / "doctor-authenticated-result.txt").write_text(
            f"authenticated_runtime=failed\nreason={type(exc).__name__}: {str(exc)[:500]}\n",
            encoding="utf-8",
        )
        print(f"::error::Authenticated Doctor Android runtime check failed: {type(exc).__name__}: {str(exc)[:500]}")
        raise
