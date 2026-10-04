import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Doctor-only intelligence workspace shell.
 * Authentication/authorization must be enforced by the clinic backend before
 * this screen is exposed in navigation.
 */
export default function DoctorIntelligenceScreen() {
  const modules = [
    ['Patient Intelligence', 'Summarize authorized patient history and surface follow-up items.'],
    ['Clinical Research', 'Retrieve evidence and compare sources for doctor review.'],
    ['Treatment Research', 'Compare treatment options, evidence, constraints and questions.'],
    ['Product Intelligence', 'Research dental materials, products and approved alternatives.'],
    ['Supplier Intelligence', 'Find regional suppliers/distributors and compare availability.'],
    ['Practice Intelligence', 'Analyze appointments, treatments, inventory and practice patterns.'],
    ['Referral Intelligence', 'Research specialists and facilities when clinic capability is insufficient.'],
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>UNIVERSAL INTELLIGENCE ENGINE</Text>
      <Text style={styles.title}>Dental Intelligence</Text>
      <Text style={styles.note}>
        Doctor-facing decision support. Patient data must remain authorized and
        clinical decisions remain with the dentist.
      </Text>

      {modules.map(([title, description]) => (
        <View key={title} style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText}>{description}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F5F9FC', minHeight: '100%' },
  kicker: { color: '#1677D2', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#0B2E4F', fontSize: 30, fontWeight: '900', marginTop: 5 },
  note: { color: '#657789', fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#DCE8F4', padding: 16, marginBottom: 10 },
  cardTitle: { color: '#0B2E4F', fontSize: 16, fontWeight: '900' },
  cardText: { color: '#657789', fontSize: 13, lineHeight: 19, marginTop: 6 },
});
