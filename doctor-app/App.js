import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { signInWithGoogle } from "./src/auth/supabase";
import * as WebBrowser from "expo-web-browser";
import {
  requestDoctorOtp,
  verifyDoctorOtp,
  loginDoctorGoogle,
  listAppointments,
  listPatients,
  updateAppointment,
  getHealth,
  getDentalChart,
  saveDentalChartEntry,
  getPeriodontogram,
  savePeriodontogramEntry,
  getMembershipPlans,
  getMembership,
  createMembershipOrder,
} from "./src/api/doctorApi";
import {
  Button,
  Card,
  Chip,
  BottomTabBar,
  StatCard,
  AppointmentRow,
  Header,
  ToothChart,
  Periodontogram,
  VisualPlaceholder,
} from "./components/ui";
import { colors, spacing, typography, shadows } from "./theme";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

const clinicLogo = require("./assets/dr-pranali-branded-logo.png");
const dentalLogo = require("./assets/universal-dental-icon.png");
const DOCTOR_LOGIN_ASSET = "doctor_login_3d.png";
const DOCTOR_DASHBOARD_ASSET = "doctor_dashboard_3d.png";
const DENTAL_JAW_ASSET = "dental_jaw_3d.png";
const STATUSES = [
  "requested",
  "confirmed",
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
];
const statusLabel = (s) =>
  (s || "").replace("_", " ").replace(/^./, (x) => x.toUpperCase());

function Login({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (phone.replace(/\D/g, "").length !== 10) {
      Alert.alert(
        "Doctor login",
        "Enter the registered 10-digit mobile number.",
      );
      return;
    }
    setBusy(true);
    try {
      const r = await requestDoctorOtp(phone);
      setChallenge(r.challenge_id);
      Alert.alert("OTP sent", "Check the registered mobile.");
    } catch (e) {
      Alert.alert("OTP unavailable", e.message || "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  };
  const googleLogin = async () => {
    setBusy(true);
    try {
      const session = await signInWithGoogle();
      if (!session?.access_token)
        throw new Error("Google did not return an access token.");
      const r = await loginDoctorGoogle(session.access_token);
      onLogin(r.access_token);
    } catch (e) {
      Alert.alert(
        "Google sign-in",
        e.message || "Could not sign in with Google.",
      );
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    if (!challenge || otp.trim().length !== 6) {
      Alert.alert("Verify OTP", "Enter the 6-digit OTP.");
      return;
    }
    setBusy(true);
    try {
      const r = await verifyDoctorOtp(phone, challenge, otp);
      onLogin(r.access_token);
    } catch (e) {
      Alert.alert(
        "Verification failed",
        e.message || "The OTP could not be verified.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginWrap}>
        <View style={styles.loginBrand}>
          <Image
            source={clinicLogo}
            style={styles.loginLogo}
            contentFit="contain"
          />
          <View>
            <Text style={styles.brandName}>Dr. Pranali</Text>
            <Text style={styles.brandClinic}>DENTAL CLINIC</Text>
          </View>
        </View>
        <Text style={styles.loginTitle}>Beautiful Smile</Text>
        <Text style={styles.loginBlue}>Confident Care</Text>
        <Text style={styles.loginSub}>
          Secure clinical workspace for appointments, patients and dental
          intelligence.
        </Text>
        <View style={styles.loginHero}>
          <View style={styles.loginHalo} />
          <VisualPlaceholder
            filename={DOCTOR_LOGIN_ASSET}
            label="DOCTOR 3D HERO"
            style={styles.loginDentalLogo}
          />
        </View>
        <Card>
          <Button
            title={busy ? "Signing in..." : "Continue with Google"}
            onPress={googleLogin}
            disabled={busy}
            icon="log-in"
          />
          <View style={styles.loginDivider}>
            <View style={styles.loginLine} />
            <Text style={styles.loginOr}>OR USE MOBILE OTP</Text>
            <View style={styles.loginLine} />
          </View>
          <Text style={styles.label}>Registered mobile number</Text>
          <View style={styles.input}>
            <Feather name="phone" size={17} color={colors.muted} />
            <TextInputPlaceholder
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          {challenge ? (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>6-digit OTP</Text>
              <View style={styles.input}>
                <Feather name="lock" size={17} color={colors.muted} />
                <TextInputPlaceholder
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <Button
                title={busy ? "Verifying..." : "Verify & Open Dashboard"}
                onPress={verify}
                disabled={busy}
                icon="unlock"
              />
            </>
          ) : (
            <Button
              title={busy ? "Sending OTP..." : "Login with Mobile"}
              onPress={send}
              disabled={busy}
              icon="arrow-right"
            />
          )}
          <Text style={styles.help}>
            Secure & encrypted ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ only the registered clinic mobile
            can access this workspace.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
function TextInputPlaceholder(props) {
  const { TextInput } = require("react-native");
  return (
    <TextInput
      {...props}
      style={styles.inputText}
      placeholderTextColor={colors.muted}
    />
  );
}

function AppointmentCard({ item, token, onChanged }) {
  const [busy, setBusy] = useState(false);
  const change = async (status) => {
    setBusy(true);
    try {
      await updateAppointment(token, item.id, { status });
      onChanged();
    } catch (e) {
      Alert.alert(
        "Update failed",
        e.message || "Could not update appointment.",
      );
    } finally {
      setBusy(false);
    }
  };
  const call = () =>
    item.patient_phone && Linking.openURL("tel:" + item.patient_phone);
  const whatsapp = () =>
    item.patient_phone &&
    Linking.openURL(
      "https://wa.me/" + String(item.patient_phone).replace(/\D/g, ""),
    );
  return (
    <View style={styles.appointmentCard}>
      <AppointmentRow
        name={item.patient_name || "Patient"}
        subtitle={item.treatment_type || "Dental visit"}
        time={item.starts_at || "Scheduled time"}
        status={
          item.status === "requested"
            ? "Upcoming"
            : item.status === "completed"
              ? "Completed"
              : "Arrived"
        }
      />
      <View style={styles.actions}>
        <Pressable onPress={call} style={styles.outlineAction}>
          <Feather name="phone" size={15} color={colors.primary} />
          <Text style={styles.actionText}>Call</Text>
        </Pressable>
        <Pressable onPress={whatsapp} style={styles.outlineAction}>
          <Ionicons name="logo-whatsapp" size={16} color={colors.success} />
          <Text style={styles.actionText}>WhatsApp</Text>
        </Pressable>
        {item.status === "requested" && (
          <Pressable
            disabled={busy}
            onPress={() => change("confirmed")}
            style={styles.confirmAction}
          >
            <Text style={styles.confirmText}>{busy ? "..." : "Confirm"}</Text>
          </Pressable>
        )}
        <Pressable
          disabled={busy}
          onPress={() => change("completed")}
          style={styles.outlineAction}
        >
          <Text style={styles.actionText}>Complete</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusChips}
      >
        {STATUSES.filter((s) => s !== item.status).map((s) => (
          <Chip key={s} label={statusLabel(s)} onPress={() => change(s)} />
        ))}
      </ScrollView>
    </View>
  );
}

function PatientProfile({ patient, token, onBack }) {
  const [chart, setChart] = useState([]);
  const [periodo, setPeriodo] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!patient) return;
    getDentalChart(token, patient.id)
      .then(setChart)
      .catch(() => setChart([]));
    getPeriodontogram(token, patient.id)
      .then(setPeriodo)
      .catch(() => setPeriodo([]));
  }, [patient, token]);
  const updateTooth = async (tooth) => {
    setSelected(tooth);
    if (!patient || saving) return;
    const current = chart.find((x) => x.tooth_fdi === tooth);
    const next =
      current?.status === "treated"
        ? "missing"
        : current?.status === "missing"
          ? "healthy"
          : current?.status === "healthy"
            ? "attention"
            : "treated";
    setSaving(true);
    try {
      await saveDentalChartEntry(token, patient.id, {
        tooth_fdi: tooth,
        status: next,
        note: "",
      });
      setChart((prev) => [
        ...prev.filter((x) => x.tooth_fdi !== tooth),
        { tooth_fdi: tooth, status: next },
      ]);
    } catch (e) {
      Alert.alert("Dental chart", e.message || "Could not save tooth status.");
    } finally {
      setSaving(false);
    }
  };
  const savePerio = async (tooth, measurements) => {
    if (!patient) return;
    try {
      await savePeriodontogramEntry(token, patient.id, {
        tooth_fdi: tooth,
        measurements,
        note: "",
      });
      setPeriodo((prev) => [
        ...prev.filter((x) => x.tooth_fdi !== tooth),
        { tooth_fdi: tooth, measurements },
      ]);
      Alert.alert("Periodontogram", "Measurements saved.");
    } catch (e) {
      Alert.alert(
        "Periodontogram",
        e.message || "Could not save measurements.",
      );
    }
  };
  const states = {};
  chart.forEach((x) => {
    states[x.tooth_fdi] = x.status;
  });
  return (
    <View>
      <Header
        title="Patient Profile"
        onBack={onBack}
        rightIcon="more-horizontal"
      />
      <Card>
        <View style={styles.profileHead}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientAvatarText}>
              {(patient.name || "P").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{patient.name}</Text>
            <Text style={styles.profileMeta}>
              {patient.phone || "No phone"}
              {patient.age ? " ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ Age " + patient.age : ""}
            </Text>
          </View>
        </View>
        <View style={styles.tags}>
          <Chip label="Overview" selected />
          <Chip label="Dental Chart" />
          <Chip label="Records" />
          <Chip label="Images" />
        </View>
        <Info label="Medical History" value="Review patient record" />
        <Info label="Allergies" value="No known allergies" />
        <Info label="Last Visit" value="Available in clinical history" />
        <Info label="Next Appointment" value="See appointment queue" />
      </Card>
      <View style={styles.clinicalHeader}>
        <Text style={styles.sectionTitle}>Dental Chart</Text>
        <Text style={styles.mutedText}>
          {saving ? "Saving..." : "Synced clinical record"}
        </Text>
      </View>
      <Card>
        <ToothChart onSelect={updateTooth} />
        <View style={styles.legendRow}>
          <Legend color={colors.success} text="Healthy" />
          <Legend color={colors.danger} text="Cavity" />
          <Legend color={colors.primary} text="Filled" />
          <Legend color={colors.warning} text="RCT" />
          <Legend color={colors.muted} text="Missing" />
        </View>
      </Card>
      <View style={styles.clinicalHeader}>
        <Text style={styles.sectionTitle}>Treatment Planning</Text>
        <Text style={styles.mutedText}>Clinical review</Text>
      </View>
      <Card>
        <VisualPlaceholder
          filename={DENTAL_JAW_ASSET}
          label="DENTAL JAW 3D"
          style={styles.treatmentHero}
        />
        {[
          "Crown / Bridge",
          "Bridge + Implant",
          "Single Tooth Implant",
          "Full Mouth Rehab",
        ].map((x, i) => (
          <View key={x} style={styles.planRow}>
            <View style={styles.planNumber}>
              <Text style={styles.planNumberText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>{x}</Text>
              <Text style={styles.planSub}>
                Treatment option ready for clinician review
              </Text>
            </View>
            <Feather name="chevron-right" size={17} color={colors.muted} />
          </View>
        ))}
        <Button
          title="Add to Treatment Plan"
          onPress={() =>
            Alert.alert(
              "Treatment Plan",
              "Selected treatment options are ready for clinician review.",
            )
          }
          icon="plus"
        />
      </Card>
      <View style={styles.clinicalHeader}>
        <Text style={styles.sectionTitle}>Periodontogram</Text>
        <Text style={styles.mutedText}>6-point probing</Text>
      </View>
      <Periodontogram patientName={patient.name} onSave={savePerio} />
      <View style={styles.quickActions}>
        <Pressable
          onPress={() => Linking.openURL("tel:" + patient.phone)}
          style={styles.quickAction}
        >
          <Feather name="phone" size={17} color={colors.primary} />
          <Text>Call</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Linking.openURL(
              "https://wa.me/" + String(patient.phone || "").replace(/\D/g, ""),
            )
          }
          style={styles.quickAction}
        >
          <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
          <Text>WhatsApp</Text>
        </Pressable>
        <Pressable onPress={onBack} style={styles.quickAction}>
          <Feather name="more-horizontal" size={18} color={colors.primary} />
          <Text>More</Text>
        </Pressable>
      </View>
    </View>
  );
}
function Info({ label, value }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}
function Legend({ color, text }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

function MembershipScreen({ token }) {
  const [plans, setPlans] = useState([]);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([
        getMembershipPlans(),
        getMembership(token),
      ]);
      setPlans(p?.plans || []);
      setMembership(m || null);
    } catch (e) {
      Alert.alert("Membership", e.message || "Could not load membership.");
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    load();
  }, [load]);
  const buy = async (plan) => {
    setBusy(plan.id);
    try {
      const r = await createMembershipOrder(token, plan.id);
      if (r?.free) {
        Alert.alert(
          "Master App",
          "Dr. Pranali Master is permanently free. No payment is required.",
        );
        return;
      }
      if (r?.razorpay?.short_url) {
        await WebBrowser.openBrowserAsync(r.razorpay.short_url);
        Alert.alert(
          "Payment started",
          "After successful payment, your clinic membership will activate automatically.",
        );
      } else {
        Alert.alert(
          "Checkout unavailable",
          "Payment checkout is not configured yet on the platform.",
        );
      }
    } catch (e) {
      Alert.alert(
        "Membership checkout",
        e.message || "Could not start checkout.",
      );
    } finally {
      setBusy(null);
    }
  };
  const isMaster = membership?.master === true;
  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={{ marginTop: 80 }}
      />
    );
  return (
    <View>
      <LinearGradient
        colors={[colors.ctaStart, colors.ctaEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.membershipHero}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.heroKicker}>CLINIC MEMBERSHIP</Text>
          <Text style={styles.heroTitle}>
            {isMaster ? "Dr. Pranali Master" : "Choose what your clinic needs"}
          </Text>
          <Text style={styles.heroSub}>
            {isMaster
              ? "Your master clinic account is permanently free."
              : "Upgrade or choose a plan without paying for features you do not need."}
          </Text>
        </View>
        <Feather
          name={isMaster ? "award" : "credit-card"}
          size={48}
          color={colors.white}
        />
      </LinearGradient>
      {isMaster ? (
        <Card style={styles.masterCard}>
          <View style={styles.masterBadge}>
            <Feather name="check-circle" size={20} color={colors.success} />
            <Text style={styles.masterBadgeText}>
              MASTER ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ FREE FOREVER
            </Text>
          </View>
          <Text style={styles.membershipTitle}>Dr. Pranali Dental Clinic</Text>
          <Text style={styles.membershipSub}>
            This account is the platform's reference/master clinic. It will
            never require a membership payment.
          </Text>
          <View style={styles.featureList}>
            {[
              "All clinical modules",
              "All AI intelligence modules",
              "Unlimited internal testing",
              "Early access to new platform features",
            ].map((x) => (
              <Text key={x} style={styles.featureText}>
                ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ {x}
              </Text>
            ))}
          </View>
        </Card>
      ) : (
        <>
          {plans.map((p, i) => (
            <Card
              key={p.id}
              style={[styles.planCard, i === 1 && styles.planFeatured]}
            >
              <View style={styles.planTop}>
                <View>
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={styles.planTag}>{p.tagline}</Text>
                </View>
                {i === 1 && <Chip label="POPULAR" selected />}
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹{p.price_inr.toLocaleString("en-IN")}
                </Text>
                <Text style={styles.per}> / month</Text>
              </View>
              <View style={styles.featureList}>
                {p.features.map((x) => (
                  <Text key={x} style={styles.featureText}>
                    ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ {x}
                  </Text>
                ))}
              </View>
              <Button
                title={
                  busy === p.id ? "Opening checkout..." : "Choose " + p.name
                }
                onPress={() => buy(p)}
                disabled={!!busy}
                icon="arrow-right"
              />
            </Card>
          ))}
        </>
      )}
      <Card style={styles.membershipNote}>
        <Feather name="shield" size={18} color={colors.primary} />
        <Text style={styles.membershipNoteText}>
          Payment is processed outside the app through Razorpay. Your payment
          credentials never enter or get stored in the APK.
        </Text>
      </Card>
    </View>
  );
}

function Dashboard({ token, logout }) {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [tab, setTab] = useState("Home");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiOk, setApiOk] = useState(false);
  const load = useCallback(async () => {
    try {
      const [a, p, h] = await Promise.all([
        listAppointments(token),
        listPatients(token),
        getHealth(),
      ]);
      setAppointments(a || []);
      setPatients(p || []);
      setApiOk(h?.status === "ok");
    } catch (e) {
      setApiOk(false);
      Alert.alert(
        "Clinic connection",
        e.message || "Could not reach the dental backend.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);
  useEffect(() => {
    load();
  }, [load]);
  if (loading)
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 100 }}
        />
      </SafeAreaView>
    );
  if (selectedPatient)
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <PatientProfile
            patient={selectedPatient}
            token={token}
            onBack={() => setSelectedPatient(null)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  const requested = appointments.filter((a) => a.status === "requested").length;
  const confirmed = appointments.filter((a) =>
    ["confirmed", "scheduled"].includes(a.status),
  ).length;
  const items = [
    { key: "Home", label: "Home", icon: "home" },
    { key: "Patients", label: "Patients", icon: "users" },
    { key: "Appointments", label: "Appointments", icon: "calendar" },
    { key: "Clinical", label: "Clinical", icon: "activity" },
    { key: "Membership", label: "Plan", icon: "credit-card" },
  ];
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.topbar}>
        <View style={styles.brandRow}>
          <Image
            source={clinicLogo}
            style={styles.clinicLogo}
            contentFit="contain"
          />
          <View>
            <Text style={styles.brandName}>Dr. Pranali</Text>
            <Text style={styles.brandClinic}>
              DENTAL CLINIC ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ TALOJA
            </Text>
          </View>
        </View>
        <Pressable onPress={logout} style={styles.signout}>
          <Feather name="log-out" size={15} color={colors.primary} />
        </Pressable>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={styles.content}
      >
        {tab === "Home" && (
          <>
            <LinearGradient
              colors={[colors.ctaStart, colors.ctaEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dashboardHero}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>DOCTOR PORTAL</Text>
                <Text style={styles.heroTitle}>Good morning, Doctor</Text>
                <Text style={styles.heroSub}>Your clinic at a glance.</Text>
              </View>
              <VisualPlaceholder
                filename={DOCTOR_DASHBOARD_ASSET}
                label="DASHBOARD 3D HERO"
                style={styles.heroDental}
              />
            </LinearGradient>
            <View style={styles.stats}>
              <StatCard
                value={appointments.length}
                label="Today"
                icon={
                  <Feather name="calendar" size={18} color={colors.primary} />
                }
              />
              <StatCard
                value={confirmed}
                label="This Week"
                icon={
                  <Feather
                    name="check-circle"
                    size={18}
                    color={colors.success}
                  />
                }
              />
              <StatCard
                value={patients.length}
                label="Total Patients"
                icon={<Feather name="users" size={18} color={colors.primary} />}
              />
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Today's Appointments</Text>
              <Text style={styles.live}>{apiOk ? "LIVE" : "OFFLINE"}</Text>
            </View>
            {appointments.slice(0, 5).map((a) => (
              <AppointmentRow
                key={a.id}
                name={a.patient_name || "Patient"}
                subtitle={a.treatment_type || "Dental visit"}
                time={a.starts_at || "Scheduled"}
                status={a.status === "requested" ? "Upcoming" : "Arrived"}
              />
            ))}
          </>
        )}
        {tab === "Appointments" && (
          <>
            <Header
              title="Appointments"
              rightIcon="refresh-cw"
              onRight={load}
            />
            {appointments.length === 0 ? (
              <Card>
                <Text style={styles.empty}>
                  No appointments yet. Patient bookings will appear here.
                </Text>
              </Card>
            ) : (
              appointments.map((a) => (
                <AppointmentCard
                  key={a.id}
                  item={a}
                  token={token}
                  onChanged={load}
                />
              ))
            )}
          </>
        )}
        {tab === "Patients" && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Patients</Text>
              <Text style={styles.mutedText}>{patients.length} records</Text>
            </View>
            {patients.length === 0 ? (
              <Card>
                <Text style={styles.empty}>No patients yet.</Text>
              </Card>
            ) : (
              patients.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedPatient(p)}
                  style={styles.patientRow}
                >
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientAvatarText}>
                      {(p.name || "P").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{p.name}</Text>
                    <Text style={styles.patientMeta}>
                      {p.phone || "No phone"}
                      {p.age ? " ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ Age " + p.age : ""}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
              ))
            )}
          </>
        )}
        {tab === "Membership" && <MembershipScreen token={token} />}\n{" "}
        {tab === "Clinical" && (
          <>
            <LinearGradient
              colors={[colors.primaryDark, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.clinicalHero}
            >
              <Text style={styles.heroKicker}>CLINICAL INTELLIGENCE</Text>
              <Text style={styles.heroTitle}>Evidence-led care workspace</Text>
              <Text style={styles.heroSub}>
                Odontogram, periodontics, treatment planning and AI support in
                one place.
              </Text>
            </LinearGradient>
            <Card>
              <Text style={styles.sectionTitle}>Clinical Modules</Text>
              {[
                "Patient Intelligence",
                "Dental Chart",
                "Periodontogram",
                "Treatment Planning",
                "Clinical Research",
                "Product & Supplier Intelligence",
              ].map((x, i) => (
                <View key={x} style={styles.moduleRow}>
                  <View style={styles.moduleIcon}>
                    <Text style={styles.moduleNumber}>0{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moduleTitle}>{x}</Text>
                    <Text style={styles.moduleSub}>
                      Ready for authorized clinical data and clinician review.
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={17}
                    color={colors.muted}
                  />
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
      <BottomTabBar items={items} active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

function AppContent() {
  const [token, setToken] = useState(null);
  return token ? (
    <Dashboard token={token} logout={() => setToken(null)} />
  ) : (
    <Login onLogin={setToken} />
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screen, paddingBottom: 100 },
  loginWrap: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loginBrand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  loginLogo: { width: 48, height: 48 },
  brandName: {
    fontFamily: typography.family.bold,
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  brandClinic: {
    fontFamily: typography.family.bold,
    fontSize: 8,
    letterSpacing: 1.7,
    color: colors.primary,
  },
  loginTitle: {
    fontFamily: typography.family.bold,
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginTop: 24,
  },
  loginBlue: {
    fontFamily: typography.family.bold,
    fontSize: 32,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },
  loginSub: {
    fontFamily: typography.family.regular,
    fontSize: 13,
    color: colors.body,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  loginHero: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  loginHalo: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.softBlue,
  },
  loginDentalLogo: { width: 210, height: 210 },
  label: {
    fontFamily: typography.family.bold,
    fontSize: 12,
    color: colors.text,
    fontWeight: "800",
    marginBottom: 7,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  inputText: {
    flex: 1,
    marginLeft: 9,
    fontFamily: typography.family.regular,
    fontSize: 14,
    color: colors.text,
  },
  help: {
    fontFamily: typography.family.regular,
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 15,
    marginTop: 10,
  },
  loginDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginVertical: 15,
  },
  loginLine: { height: 1, flex: 1, backgroundColor: colors.border },
  loginOr: {
    fontFamily: typography.family.bold,
    fontSize: 8,
    letterSpacing: 0.7,
    color: colors.muted,
  },
  topbar: {
    height: 64,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  clinicLogo: { width: 42, height: 42, borderRadius: 12 },
  signout: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardHero: {
    minHeight: 160,
    borderRadius: spacing.radiusXl,
    padding: 18,
    flexDirection: "row",
    overflow: "hidden",
    ...shadows.button,
  },
  heroKicker: {
    fontFamily: typography.family.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.blue100,
    fontWeight: "800",
  },
  heroTitle: {
    fontFamily: typography.family.bold,
    fontSize: 24,
    fontWeight: "800",
    color: colors.white,
    marginTop: 4,
  },
  heroSub: {
    fontFamily: typography.family.regular,
    fontSize: 12,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  heroDental: { width: 125, height: 125, alignSelf: "center", marginRight: -8 },
  stats: { flexDirection: "row", gap: 8, marginVertical: 12 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: typography.family.bold,
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  live: {
    fontFamily: typography.family.bold,
    fontSize: 9,
    color: colors.success,
    fontWeight: "800",
  },
  mutedText: {
    fontFamily: typography.family.medium,
    fontSize: 10,
    color: colors.muted,
  },
  empty: {
    fontFamily: typography.family.regular,
    fontSize: 13,
    color: colors.body,
    textAlign: "center",
    paddingVertical: 18,
  },
  appointmentCard: { marginBottom: 10 },
  actions: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginTop: 4 },
  outlineAction: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontFamily: typography.family.bold,
    fontSize: 10,
    color: colors.text,
    fontWeight: "800",
  },
  confirmAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: colors.success,
  },
  confirmText: {
    fontFamily: typography.family.bold,
    fontSize: 10,
    color: colors.white,
    fontWeight: "800",
  },
  statusChips: { gap: 6, paddingTop: 8 },
  patientRow: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radiusMd,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    ...shadows.card,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  patientAvatarText: {
    fontFamily: typography.family.bold,
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary,
  },
  patientName: {
    fontFamily: typography.family.bold,
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  patientMeta: {
    fontFamily: typography.family.regular,
    fontSize: 11,
    color: colors.body,
    marginTop: 2,
  },
  profileHead: { flexDirection: "row", alignItems: "center" },
  profileName: {
    fontFamily: typography.family.bold,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  profileMeta: {
    fontFamily: typography.family.regular,
    fontSize: 11,
    color: colors.body,
    marginTop: 3,
  },
  tags: { flexDirection: "row", gap: 6, marginVertical: 14 },
  info: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    fontFamily: typography.family.medium,
    fontSize: 10,
    color: colors.muted,
  },
  infoValue: {
    fontFamily: typography.family.bold,
    fontSize: 12,
    color: colors.text,
    marginTop: 2,
  },
  clinicalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 9,
  },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  legend: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontFamily: typography.family.medium,
    fontSize: 9,
    color: colors.body,
  },
  treatmentHero: { height: 150, width: "100%" },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  planNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  planNumberText: {
    fontFamily: typography.family.bold,
    fontSize: 11,
    color: colors.primary,
    fontWeight: "800",
  },
  planTitle: {
    fontFamily: typography.family.bold,
    fontSize: 12,
    color: colors.text,
    fontWeight: "800",
  },
  planSub: {
    fontFamily: typography.family.regular,
    fontSize: 9,
    color: colors.body,
    marginTop: 2,
  },
  quickActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  quickAction: {
    flex: 1,
    height: 48,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  quickActionText: {
    fontFamily: typography.family.medium,
    fontSize: 10,
    color: colors.text,
  },
  membershipHero: {
    borderRadius: spacing.radiusXl,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  masterCard: {
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.white,
  },
  masterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  masterBadgeText: {
    fontFamily: typography.family.bold,
    fontSize: 10,
    color: colors.success,
    fontWeight: "800",
  },
  membershipTitle: {
    fontFamily: typography.family.bold,
    fontSize: 20,
    color: colors.text,
    fontWeight: "800",
  },
  membershipSub: {
    fontFamily: typography.family.regular,
    fontSize: 12,
    color: colors.body,
    lineHeight: 18,
    marginTop: 5,
  },
  planCard: { marginBottom: 12 },
  planFeatured: { borderWidth: 2, borderColor: colors.primary },
  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planName: {
    fontFamily: typography.family.bold,
    fontSize: 20,
    color: colors.text,
    fontWeight: "800",
  },
  planTag: {
    fontFamily: typography.family.regular,
    fontSize: 10,
    color: colors.body,
    lineHeight: 15,
    marginTop: 3,
    maxWidth: 230,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 10,
  },
  price: {
    fontFamily: typography.family.bold,
    fontSize: 28,
    color: colors.primary,
    fontWeight: "800",
  },
  per: {
    fontFamily: typography.family.regular,
    fontSize: 11,
    color: colors.muted,
  },
  featureList: { gap: 6, marginBottom: 12 },
  featureText: {
    fontFamily: typography.family.medium,
    fontSize: 11,
    color: colors.body,
  },
  membershipNote: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  membershipNoteText: {
    flex: 1,
    fontFamily: typography.family.regular,
    fontSize: 10,
    color: colors.body,
    lineHeight: 15,
  },
  clinicalHero: {
    borderRadius: spacing.radiusXl,
    padding: 18,
    marginBottom: 12,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  moduleNumber: {
    fontFamily: typography.family.bold,
    fontSize: 10,
    color: colors.primary,
    fontWeight: "800",
  },
  moduleTitle: {
    fontFamily: typography.family.bold,
    fontSize: 13,
    color: colors.text,
    fontWeight: "800",
  },
  moduleSub: {
    fontFamily: typography.family.regular,
    fontSize: 10,
    color: colors.body,
    lineHeight: 14,
    marginTop: 2,
  },
});
