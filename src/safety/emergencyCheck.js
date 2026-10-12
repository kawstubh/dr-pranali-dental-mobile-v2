const EMERGENCY_PHRASES = [
  {
    code: 'breathing_difficulty',
    phrases: [
      'cannot breathe', 'cant breathe', 'can t breathe', 'difficulty breathing', 'trouble breathing',
      'shortness of breath', 'unable to breathe', 'gasping for air',
      'सांस नहीं आ रही', 'साँस नहीं आ रही', 'सांस लेने में दिक्कत', 'साँस लेने में दिक्कत',
      'सांस लेने में परेशानी', 'दम घुट रहा', 'गला सूज गया और सांस',
      'श्वास घ्यायला त्रास', 'श्वास घेता येत नाही', 'श्वास घ्यायला त्रास होतोय',
      'धाप लागतेय', 'दम लागतोय', 'घसा सुजला आणि श्वास',
      'saans nahi aa rahi', 'saans lene mein dikkat', 'saans lene me dikkat',
      'saans lene mein pareshani', 'dam ghut raha', 'gala suj gaya aur saans',
      'shwas ghyayla tras', 'shwas ghyayla traas', 'shwas gheta yet nahi',
      'shwas ghyayla tras hotoy', 'dhap lagtey', 'ghasa sujla ani shwas'
    ]
  },
  {
    code: 'chest_pain',
    phrases: [
      'chest pain', 'severe chest pain', 'chest hurts', 'heart attack',
      'सीने में दर्द', 'सीने में तेज दर्द', 'छाती में दर्द', 'छाती में तेज दर्द',
      'छातीत दुखतंय', 'छातीत दुखत आहे', 'छातीत तीव्र वेदना',
      'seene mein dard', 'seene me dard', 'seene mein tez dard', 'chhati me dard',
      'chati me dard', 'chhatit dukhatay', 'chhatit dukhtey', 'chhatit dukhat aahe', 'chhatit dukhata aahe', 'chhatit tivra vedana'
    ]
  },
  {
    code: 'uncontrolled_bleeding',
    phrases: [
      'bleeding wont stop', 'bleeding will not stop', 'severe bleeding', 'blood wont stop',
      'खून बंद नहीं हो रहा', 'खून बहना बंद नहीं हो रहा', 'रक्तस्राव नहीं रुक रहा',
      'रक्त थांबत नाही', 'रक्तस्राव थांबत नाही',
      'khoon band nahi ho raha', 'khoon ruk nahi raha', 'khoon behna band nahi ho raha',
      'rakt thambat nahi', 'raktasrav thambat nahi'
    ]
  },
  {
    code: 'loss_of_consciousness',
    phrases: [
      'unconscious', 'passed out', 'not waking up', 'fainted and not waking',
      'बेहोश', 'होश नहीं आ रहा', 'बेशुद्ध', 'शुद्धीवर नाही',
      'behosh', 'hosh nahi aa raha', 'shuddhivar nahi', 'shuddhivar yet nahi'
    ]
  },
  {
    code: 'stroke_or_seizure',
    phrases: [
      'signs of stroke', 'face drooping', 'slurred speech', 'having a seizure', 'seizure',
      'झटका आ रहा', 'दौरा पड़ रहा', 'अचानक बोल नहीं पा रहा', 'चेहरा टेढ़ा हो गया',
      'झटका येतोय', 'फिट येत आहे', 'अचानक बोलता येत नाही', 'चेहरा वाकडा झाला',
      'jhatka aa raha', 'daura pad raha', 'bol nahi pa raha', 'chehra tedha ho gaya',
      'fit yetoy', 'fit yet ahe', 'achanak bolta yet nahi', 'chehra vakda zala'
    ]
  }
];

const GUIDANCE = {
  en: 'This may be a medical emergency. Call India’s emergency number 112 now or go to the nearest emergency department. Do not wait for an AI response.',
  hi: 'यह मेडिकल इमरजेंसी हो सकती है। अभी 112 पर कॉल करें या नज़दीकी इमरजेंसी विभाग जाएँ। AI के जवाब का इंतज़ार न करें।',
  mr: 'ही वैद्यकीय आपत्कालीन स्थिती असू शकते. आत्ताच 112 वर कॉल करा किंवा जवळच्या आपत्कालीन विभागात जा. AI च्या उत्तराची वाट पाहू नका.'
};

export function normalizeEmergencyText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectEmergency(value) {
  const text = normalizeEmergencyText(value);
  if (!text) return { isEmergency: false, code: null };
  for (const rule of EMERGENCY_PHRASES) {
    if (rule.phrases.some(phrase => text.includes(normalizeEmergencyText(phrase)))) {
      return { isEmergency: true, code: rule.code };
    }
  }
  return { isEmergency: false, code: null };
}

export function createEmergencyResponse(language = 'en', detection = {}) {
  const lang = ['en', 'hi', 'mr'].includes(language) ? language : 'en';
  return {
    emergency: true,
    requires_emergency_services: true,
    source: 'deterministic_local_emergency_check',
    emergency_code: detection.code || 'possible_emergency',
    language: lang,
    answer: GUIDANCE[lang],
  };
}

export function checkEmergency(value, language = 'en') {
  const detection = detectEmergency(value);
  return detection.isEmergency ? createEmergencyResponse(language, detection) : null;
}
