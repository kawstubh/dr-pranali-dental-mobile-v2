import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEmergency, detectEmergency } from '../src/safety/emergencyCheck.js';
import { translate } from '../src/translations.js';

const emergencyExamples = [
  ['English contraction breathing emergency', 'I can’t breathe properly', 'breathing_difficulty'],
  ['Hindi Devanagari breathing emergency', 'मुझे सांस लेने में दिक्कत हो रही है', 'breathing_difficulty'],
  ['Marathi Devanagari breathing emergency', 'मला श्वास घ्यायला त्रास होतोय', 'breathing_difficulty'],
  ['Hinglish Roman Hindi breathing emergency', 'Mujhe saans nahi aa rahi hai', 'breathing_difficulty'],
  ['Roman Marathi breathing emergency', 'Mala shwas ghyayla traas hotoy', 'breathing_difficulty'],
  ['English chest pain', 'I have severe chest pain', 'chest_pain'],
  ['Hindi chest pain', 'मेरे सीने में तेज दर्द है', 'chest_pain'],
  ['Marathi chest pain', 'माझ्या छातीत तीव्र वेदना आहेत', 'chest_pain'],
  ['Hinglish chest pain', 'Mere seene mein dard ho raha hai', 'chest_pain'],
  ['Roman Marathi chest pain', 'Majhya chhatit dukhat aahe', 'chest_pain'],
  ['Hindi uncontrolled bleeding', 'खून बंद नहीं हो रहा है', 'uncontrolled_bleeding'],
  ['Marathi uncontrolled bleeding', 'रक्त थांबत नाहीये', 'uncontrolled_bleeding'],
  ['Hinglish uncontrolled bleeding', 'Mere muh se khoon ruk nahi raha', 'uncontrolled_bleeding'],
  ['Roman Marathi uncontrolled bleeding', 'Majhya tondatun rakt thambat nahi', 'uncontrolled_bleeding'],
  ['Hindi unconsciousness', 'वह बेहोश है और होश नहीं आ रहा', 'loss_of_consciousness'],
  ['Marathi unconsciousness', 'तो बेशुद्ध आहे, शुद्धीवर येत नाही', 'loss_of_consciousness'],
  ['Hinglish unconsciousness', 'Woh behosh hai aur hosh nahi aa raha', 'loss_of_consciousness'],
  ['Roman Marathi unconsciousness', 'To beshuddha aahe, shuddhivar yet nahi', 'loss_of_consciousness'],
  ['Hindi seizure', 'उन्हें दौरा पड़ रहा है', 'stroke_or_seizure'],
  ['Marathi stroke symptom', 'अचानक बोलता येत नाही', 'stroke_or_seizure'],
  ['Hinglish seizure', 'Unko daura pad raha hai', 'stroke_or_seizure'],
  ['Roman Marathi stroke symptom', 'Tyala achanak bolta yet nahi', 'stroke_or_seizure']
];

for (const [name, phrase, expectedCode] of emergencyExamples) {
  test(name, () => {
    const result = detectEmergency(phrase);
    assert.equal(result.isEmergency, true);
    assert.equal(result.code, expectedCode);
  });
}

test('normal dental discomfort does not automatically trigger emergency response', () => {
  assert.deepEqual(detectEmergency('My tooth hurts when I drink cold water'), {
    isEmergency: false,
    code: null
  });
  assert.equal(checkEmergency('दात दुखतो', 'mr'), null);
  assert.equal(checkEmergency('Mere daant mein halka dard hai', 'hi'), null);
});

test('emergency response follows the selected display language', () => {
  assert.equal(checkEmergency('saans nahi aa rahi', 'hi').language, 'hi');
  assert.match(checkEmergency('saans nahi aa rahi', 'hi').answer, /112/);
  assert.equal(checkEmergency('shwas ghyayla tras', 'mr').language, 'mr');
  assert.match(checkEmergency('shwas ghyayla tras', 'mr').answer, /112/);
});

test('empty input and unsupported language are handled safely', () => {
  assert.equal(checkEmergency('', 'en'), null);
  assert.equal(checkEmergency('I cannot breathe', 'unsupported').language, 'en');
});

test('safety notice, consent copy, emergency banner, and doctor-review labels have Hindi and Marathi translations', () => {
  const keys = [
    'Emergency Dental Care',
    'For urgent dental pain, swelling, bleeding or a dental injury, call the clinic directly so we can guide you on the next step.',
    'Not a diagnosis',
    'This information is educational and is not a diagnosis or a substitute for advice from a qualified dentist.',
    'Before you use dental AI',
    'I understand and consent to use dental AI for educational guidance.',
    'AI suggestion, doctor to verify',
    'AI suggestion — doctor to verify',
    'AI suggestion - doctor to verify'
  ];
  for (const language of ['hi', 'mr']) {
    for (const key of keys) {
      assert.notEqual(translate(language, key), key, `${language} missing translation for: ${key}`);
    }
  }
});
