import React, { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

const tasksSeed = [
  { id: 'room', title: 'Prepare treatment room', detail: 'Check chair, instruments and sterilization setup.' },
  { id: 'supplies', title: 'Check daily supplies', detail: 'Confirm gloves, masks, suction tips and patient essentials.' },
  { id: 'schedule', title: 'Review appointment workflow', detail: 'Appointment access becomes available after Assistant authorization is connected.' },
  { id: 'followup', title: 'Prepare follow-up workflow', detail: 'Follow clinic instructions; do not change clinical advice or records.' },
];

export default function AssistantWorkspace() {
  const [done, setDone] = useState({});
  const completed = tasksSeed.filter(task => done[task.id]).length;
  return (
    <View>
      <View style={s.hero}>
        <Text style={s.kicker}>CLINIC TEAM WORKSPACE</Text>
        <Text style={s.title}>Assistant desk</Text>
        <Text style={s.subtitle}>Daily preparation and coordination tasks for the dental assistant.</Text>
        <View style={s.track}><View style={[s.fill, { width: (completed / tasksSeed.length * 100) + '%' }]} /></View>
        <Text style={s.progress}>{completed} of {tasksSeed.length} tasks completed today</Text>
      </View>
      <View style={s.notice}>
        <Text style={s.noticeTitle}>Setup preview — patient access is not enabled</Text>
        <Text style={s.noticeText}>Assistant sign-in and server-enforced role permissions must be connected before real appointments or patient records can appear here. Doctor-only AI and clinical chart editing are not available in this workspace.</Text>
      </View>
      <Text style={s.sectionTitle}>Daily checklist</Text>
      {tasksSeed.map((task, i) => (
        <Pressable key={task.id} onPress={() => setDone(prev => ({ ...prev, [task.id]: !prev[task.id] }))} style={[s.task, done[task.id] && s.taskDone]}>
          <View style={[s.check, done[task.id] && s.checkDone]}><Text style={s.checkText}>{done[task.id] ? '✓' : i + 1}</Text></View>
          <View style={s.taskCopy}>
            <Text style={[s.taskTitle, done[task.id] && s.taskTitleDone]}>{task.title}</Text>
            <Text style={s.detail}>{task.detail}</Text>
          </View>
          <Text style={s.action}>{done[task.id] ? 'Done' : 'Mark done'}</Text>
        </Pressable>
      ))}
      <View style={s.card}>
        <Text style={s.cardTitle}>Next integration steps</Text>
        {[
          'Authorize Assistant accounts through the clinic backend',
          'Limit access to appointment coordination and assigned tasks',
          'Keep patient charts and clinical AI restricted to authorized doctors',
          'Verify audit logging and clinic-level data isolation',
        ].map((item, i) => <View key={item} style={s.bullet}><Text style={s.number}>{i + 1}</Text><Text style={s.bulletText}>{item}</Text></View>)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: '#0A2F6B', borderRadius: 20, padding: 18, marginBottom: 12 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, color: '#9AD8FF' },
  title: { fontSize: 25, fontWeight: '900', color: '#FFFFFF', marginTop: 5 },
  subtitle: { fontSize: 12, lineHeight: 18, color: '#D9EAF7', marginTop: 5 },
  track: { height: 7, borderRadius: 5, backgroundColor: '#31558A', marginTop: 17, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 5, backgroundColor: '#63D9B0' },
  progress: { fontSize: 10, fontWeight: '800', color: '#D9EAF7', marginTop: 7 },
  notice: { backgroundColor: '#FFF8E8', borderRadius: 14, borderWidth: 1, borderColor: '#F0D7A4', padding: 13, marginBottom: 14 },
  noticeTitle: { fontSize: 12, fontWeight: '900', color: '#80550B' },
  noticeText: { fontSize: 11, lineHeight: 16, color: '#684A16', marginTop: 5 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: '#0A2F6B', marginBottom: 10 },
  task: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3ECF5', borderRadius: 15, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskDone: { backgroundColor: '#F2FBF6', borderColor: '#BDE8D0' },
  check: { width: 31, height: 31, borderRadius: 10, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: '#DDF7EA' },
  checkText: { fontSize: 11, fontWeight: '900', color: '#0A84E8' },
  taskCopy: { flex: 1 },
  taskTitle: { fontSize: 12, fontWeight: '900', color: '#0A2F6B' },
  taskTitleDone: { color: '#147A4B' },
  detail: { fontSize: 10, color: '#5B779E', lineHeight: 14, marginTop: 3 },
  action: { fontSize: 9, fontWeight: '900', color: '#0A84E8' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E3ECF5', padding: 14, marginTop: 6 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0A2F6B', marginBottom: 6 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 8 },
  number: { fontSize: 10, fontWeight: '900', color: '#0A84E8', backgroundColor: '#EAF4FF', width: 23, height: 23, textAlign: 'center', textAlignVertical: 'center', borderRadius: 8, overflow: 'hidden', paddingTop: 5 },
  bulletText: { fontSize: 11, lineHeight: 16, color: '#173A60', flex: 1 },
});
