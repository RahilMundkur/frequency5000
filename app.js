(function () {
  'use strict';
  var COURSE_IDS = ['fr', 'en'];
  var COURSE_META = { fr: { data: 'FRENCH_DATA', file: 'data-fr.js' }, en: { data: 'ENGLISH_DATA', file: 'data-en.js' } };
  var COURSE_UI = {
    th: { label: 'เลือกภาษาที่จะเรียน', fr: 'ภาษาฝรั่งเศส (Français)', en: 'ภาษาอังกฤษ (English)' },
    en: { label: 'I want to learn', fr: 'French (Français)', en: 'English' }
  };
  var THEME_UI = {
    th: {
      menu: 'หมวดตามหัวข้อ (มีรูปภาพ)', hint: 'คำศัพท์เป็นหมวดๆ พร้อมรูปภาพ เรียงตามความถี่ — เหมาะสำหรับเด็ก',
      showPics: 'แสดงรูปภาพประกอบ', picsOnly: 'แสดงรูปอย่างเดียว (ซ่อนคำแปล)', picsOnlyShort: '🖼 รูปอย่างเดียว',
      credit: 'รูปภาพ: Twemoji (Twitter, Inc. และผู้ร่วมพัฒนา) ใช้ภายใต้สัญญาอนุญาต CC-BY 4.0',
      freqNote: 'รายการหลัก 5,000 คำคัดจากความถี่ในการใช้จริงเท่านั้น ส่วนคำในหมวดหัวข้อที่อยู่นอกรายการนี้จัดเรียงตามความถี่ภายในหมวดของตัวเอง',
      names: { animals: 'สัตว์', food: 'อาหารและเครื่องดื่ม', body: 'ร่างกายและเสื้อผ้า', home: 'บ้านและครอบครัว', town: 'เมืองและการเดินทาง', nature: 'ธรรมชาติและอากาศ', school: 'โรงเรียน งาน และความสนุก', basics: 'สี ตัวเลข และเวลา', more: 'คำอื่นๆ' }
    },
    en: {
      menu: 'Themes (with pictures)', hint: 'Themed word sets with pictures, ranked by frequency inside each theme – great for children.',
      showPics: 'Show pictures', picsOnly: 'Pictures only (hide the translation)', picsOnlyShort: '🖼 Pictures only',
      credit: 'Pictures: Twemoji by Twitter, Inc. and other contributors, used under CC-BY 4.0.',
      freqNote: 'The main 5,000-word list is chosen strictly by real usage frequency. Words in the themes that are not in that list are ranked by frequency inside their own theme.',
      names: { animals: 'Animals', food: 'Food & drink', body: 'Body & clothes', home: 'Home & family', town: 'Town & travel', nature: 'Nature & weather', school: 'School, work & fun', basics: 'Colours, numbers & time', more: 'More words' }
    }
  };
  var COURSE = 'fr';
  var BRAND = 'Frequency5000';
  var DATA, CAT_IDS, APP_ID, DEFAULT_RATE, HW_LANG, SPEECH_LANG, VOICE_LANG_RE, TEST_PHRASE;
  var hw, wkey, meanLang, mean, exTr, clash, BAD_VOICES, voiceScore, CAT_NAMES, CAT_HINT, posLabel, STR;
  var COURSES = {};
  COURSES.fr = function () {
  /* ==== APP CONFIG (Mille Mots) ==== */
  var DATA = window.FRENCH_DATA || { words: [], cats: {} };
  var CAT_IDS = ['all', 'noun', 'verb', 'adj', 'adv', 'prep', 'other'];
  var STORE_KEY = 'millemots.v2';
  var OLD_KEY = 'millemots.v1';   // v1 progress refers to the old set order, so only its settings are carried over
  var APP_ID = 'millemots';
  var DEFAULT_RATE = 0.9;
  var HW_LANG = 'fr';
  var SPEECH_LANG = 'fr-FR';
  var VOICE_LANG_RE = /^fr/i;
  var TEST_PHRASE = 'Bonjour, comment allez-vous ?';
  function defaultLang() {
    var l = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
    return l.indexOf('th') === 0 ? 'th' : 'en';
  }
  function hw(w) { return w.fr; }
  function wkey(w) { return w.fr + '|' + w.pos; }
  function meanLang() { return lang() === 'th' ? 'th' : 'en'; }
  function mean(w) { return lang() === 'th' ? w.th : w.en; }
  function exTr(w) { return lang() === 'th' ? w.exTh : w.exEn; }
  function gparts(g, th) {
    var out = {};
    g.split(/[\/,;]/).forEach(function (x) {
      x = x.replace(/\(.*?\)/g, '').trim();
      if (!th) x = x.toLowerCase().replace(/^(to|the|a|an) /, '');
      if (x) out[x] = 1;
    });
    return out;
  }
  function overlap(a, b) { return Object.keys(a).some(function (k) { return b[k]; }); }
  function clash(a, b) {   // two words whose meanings overlap must not be in one matching round
    return overlap(gparts(a.en, false), gparts(b.en, false)) || overlap(gparts(a.th, true), gparts(b.th, true));
  }

  // Novelty / quirky voices that ship with macOS and some browsers: never offered or auto-picked.
  var BAD_VOICES = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|junior|kathy|organ|ralph|superstar|trinoids|whisper|wobble|zarvox|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|espeak|compact)\b/i;
  // Preferred natural French voices, best first (macOS, iOS, Chrome, Edge/Windows, Android).
  var GOOD_VOICES = [/premium|enhanced|natural|neural/i, /\b(am[eé]lie|audrey|aur[eé]lie|marie|thomas|l[eé]a|denise|henri|eloise|claude|vivienne|remy|r[eé]my)\b/i, /google fran[cç]ais/i, /\b(hortense|julie|paul)\b/i];
  function voiceScore(v) {
    var sc = 0;
    for (var i = 0; i < GOOD_VOICES.length; i++) if (GOOD_VOICES[i].test(v.name)) { sc = 10 - i * 2; break; }
    if (/^fr-FR/i.test(v.lang)) sc += 2; else if (/^fr-CA/i.test(v.lang)) sc += 1;
    if (v.localService === false) sc += 0.5;
    return sc;
  }

  var CAT_NAMES = {
    th: { all: 'ทั้งหมด', noun: 'คำนาม', verb: 'คำกริยา', adj: 'คำคุณศัพท์', adv: 'คำกริยาวิเศษณ์', prep: 'คำบุพบท', other: 'อื่นๆ' },
    en: { all: 'All', noun: 'Nouns', verb: 'Verbs', adj: 'Adjectives', adv: 'Adverbs', prep: 'Prepositions', other: 'Other' }
  };
  var CAT_HINT = {
    th: 'อื่นๆ = สรรพนาม จำนวน ตัวกำหนด สันธาน อุทาน คำนำหน้านาม และวลีสำเร็จรูป',
    en: 'Other = pronouns, numbers, determiners, conjunctions, interjections, articles and set phrases'
  };
  var POS_TH = { noun: 'นาม', verb: 'กริยา', adj: 'คุณศัพท์', adv: 'กริยาวิเศษณ์', prep: 'บุพบท', num: 'จำนวน', pron: 'สรรพนาม', conj: 'สันธาน', det: 'ตัวกำหนด', interj: 'อุทาน', art: 'คำนำหน้านาม', phrase: 'วลี' };
  function posLabel(p) { return lang() === 'th' && POS_TH[p] ? POS_TH[p] : p; }

  var STR = {
    th: {
      appName: 'Mille Mots', pageTitle: 'Mille Mots – เรียนคำศัพท์ภาษาฝรั่งเศส',
      metaDesc: 'เรียนคำศัพท์ภาษาฝรั่งเศสที่ใช้บ่อยที่สุด 5,000 คำ ด้วยเกมจับคู่ เสียงอ่าน และประโยคตัวอย่าง',
      homeTitle: 'เรียนคำศัพท์ภาษาฝรั่งเศสที่ใช้บ่อยที่สุด 5,000 คำ',
      homeIntro: 'จับคู่ทีละ 20 คำ แตะคำฝรั่งเศสเพื่อฟังเสียง และแตะรูปหลอดไฟเพื่อดูประโยคตัวอย่าง',
      voiceHintText: 'เสียงอ่านฟังแปลกๆ ใช่ไหม? ลองเลือกเสียงอื่นในการตั้งค่า (เสียงที่มี ★ ฟังเป็นธรรมชาติกว่า)', voiceHintBtn: 'เลือกเสียง', voiceHintClose: 'ไม่ต้องแสดงอีก',
      testMe: 'เลือกหมวดที่จะฝึก',
      nextSet: 'ชุดต่อไป: ชุดที่ ', words: 'คำที่ ', allDone: 'ครบทุกชุดแล้ว!', replayHint: 'เล่นชุดไหนซ้ำก็ได้เพื่อเก็บดาวเพิ่ม',
      cont: 'เรียนต่อ', start: 'เริ่มเลย', replay1: 'เล่นชุดที่ 1 อีกครั้ง',
      setsDone: 'ชุดที่ผ่านแล้ว', wordsPracticed: 'คำที่ฝึกแล้ว', stars: 'ดาว',
      setWord: 'ชุดที่ ', matchedAria: 'คำที่จับคู่แล้ว', matched: 'จับคู่แล้ว', mistake: 'ครั้งที่ผิด',
      autoSpeak: 'อ่านออกเสียงอัตโนมัติ', shuffle: 'สลับใหม่', allSets: 'ทุกชุด',
      listen: 'ฟังเสียง ', hintFor: 'ประโยคตัวอย่างของ ', example: 'ตัวอย่าง', listenWord: '🔊 คำศัพท์', listenSentence: '🔊 ประโยค',
      noSpeech: 'เบราว์เซอร์นี้ไม่รองรับเสียงอ่าน',
      noVoice: 'ไม่พบเสียงภาษาฝรั่งเศสในอุปกรณ์นี้ กรุณาติดตั้งเสียงในการตั้งค่าของเครื่อง',
      complete: ' เสร็จแล้ว!', perfect: 'สมบูรณ์แบบ ไม่มีผิดเลย!', mistakesRound: ' ครั้งในรอบนี้', nextBtn: 'ชุดต่อไป →', again: 'เล่นอีกครั้ง', review: 'ทบทวน',
      settings: 'การตั้งค่า', voice: 'เสียงอ่าน', auto: 'อัตโนมัติ', speed: 'ความเร็วเสียง', theme: 'ธีม', themeAuto: 'ตามอุปกรณ์', themeLight: 'สว่าง', themeDark: 'มืด',
      testVoice: 'ทดสอบเสียง', play: '🔊 เล่น', voicesN: ' เสียงภาษาฝรั่งเศสที่ใช้ได้', noVoices: 'ไม่พบเสียงภาษาฝรั่งเศสในอุปกรณ์นี้',
      reset: 'ล้างความคืบหน้า', confirmReset: 'ลบความคืบหน้าทั้งหมดในอุปกรณ์นี้?', language: 'ภาษาของแอป', close: 'ปิด',
      about: 'เกี่ยวกับ Mille Mots',
      about1: 'Mille Mots ช่วยให้เรียนคำศัพท์ภาษาฝรั่งเศสที่ใช้บ่อยที่สุด 5,000 คำ แบ่งเป็นชุดละ 20 คำ (ฝึกทั้งหมด หรือเลือกเฉพาะคำนาม กริยา คุณศัพท์ ฯลฯ) ผ่านเกมจับคู่ เสียงอ่าน และประโยคตัวอย่าง',
      about2: 'ความหมายภาษาไทย ภาษาอังกฤษ และคำแปลประโยคในแอปนี้เขียนขึ้นเฉพาะสำหรับแอปนี้ เป็นคำแปลสั้นๆ เพื่อการเรียนรู้ ไม่ใช่ความหมายตามพจนานุกรม และอาจมีข้อผิดพลาดได้ หากพบข้อผิดพลาด กรุณากดปุ่มส่งความเห็นเพื่อแจ้งผู้จัดทำแอป',
      ack: 'กิตติกรรมประกาศ',
      about3: 'การเลือกและเรียงลำดับคำอ้างอิงจากสถิติความถี่ของคำในบทบรรยายภาพยนตร์และโทรทัศน์ (โครงการ “FrequencyWords” โดย Hermit Dave อิงข้อมูล OpenSubtitles ใช้สัญญาอนุญาต CC BY-SA 4.0) โดยใช้เฉพาะลำดับของคำเท่านั้น ส่วนความหมายและประโยคเขียนขึ้นใหม่ทั้งหมด',
      about4: 'เสียงอ่านใช้เสียงที่มีอยู่ในอุปกรณ์หรือเบราว์เซอร์ของคุณ คุณภาพอาจแตกต่างกัน แอปนี้ไม่โหลดโค้ด ฟอนต์ หรือระบบติดตามจากภายนอก เก็บความคืบหน้าไว้ในอุปกรณ์ของคุณเท่านั้น และใช้งานแบบออฟไลน์ได้หลังโหลดครั้งแรก',
      loadFail: 'โหลดข้อมูลคำศัพท์ไม่สำเร็จ', home: 'หน้าแรก', aboutTitle: 'เกี่ยวกับ', settingsTitle: 'การตั้งค่า',
      feedbackBtn: 'ส่งความเห็น', feedbackTitle: 'ส่งความเห็นหรือแจ้งข้อผิดพลาด', fbType: 'ประเภท',
      fbMistake: 'พบข้อผิดพลาดในคำศัพท์หรือคำแปล', fbSuggestion: 'ข้อเสนอแนะ', fbBug: 'แอปทำงานผิดปกติ',
      fbWord: 'คำที่เกี่ยวข้อง (ถ้ามี)', fbMsg: 'ข้อความ', fbPlaceholder: 'เล่าให้เราฟังได้เลย เช่น คำแปลที่ถูกควรเป็นอะไร',
      fbSend: '✉ ส่งอีเมล', fbOpenForm: 'เปิดแบบฟอร์ม', fbCopy: 'คัดลอกข้อความ', fbCopied: 'คัดลอกข้อความแล้ว', fbEmpty: 'กรุณาพิมพ์ข้อความก่อน',
      fbNoEmail: 'ผู้จัดทำยังไม่ได้ตั้งค่าที่อยู่รับความเห็น กรุณาคัดลอกข้อความแล้วส่งให้ผู้จัดทำโดยตรง',
      reportWord: '⚑ แจ้งปัญหาคำนี้',
      reviewBtn: 'ทบทวนคำที่พลาด', reviewCount: ' คำรอทบทวน', reviewNone: 'ยังไม่มีคำที่พลาด เยี่ยมมาก!', reviewStart: 'เริ่มทบทวน',
      reviewDone: 'ทบทวนเสร็จแล้ว!', reviewLeft: ' คำยังต้องทบทวนต่อ', reviewAllClear: 'ไม่เหลือคำที่พลาดแล้ว เก่งมาก!', reviewAgain: 'ทบทวนอีกรอบ'
    },
    en: {
      appName: 'Mille Mots', pageTitle: 'Mille Mots – Learn French',
      metaDesc: 'Learn the 5,000 most common French words with matching games, speech and example sentences.',
      homeTitle: 'Learn the 5,000 most common French words',
      homeIntro: 'Match 20 words at a time. Tap a French word to hear it, and tap the light bulb for an example sentence.',
      voiceHintText: 'Does the voice sound odd? Pick another one in Settings (voices marked ★ sound more natural).', voiceHintBtn: 'Pick a voice', voiceHintClose: 'Don’t show again',
      testMe: 'Choose what to practise',
      nextSet: 'Next: set ', words: 'Words ', allDone: 'All sets complete!', replayHint: 'Replay any set to improve your stars.',
      cont: 'Continue', start: 'Start', replay1: 'Replay set 1',
      setsDone: 'sets completed', wordsPracticed: 'words practised', stars: 'stars',
      setWord: 'Set ', matchedAria: 'Matched words', matched: 'matched', mistake: 'mistake',
      autoSpeak: 'Auto-speak', shuffle: 'Shuffle', allSets: 'All sets',
      listen: 'Listen to ', hintFor: 'Example sentence for ', example: 'Example', listenWord: '🔊 Word', listenSentence: '🔊 Sentence',
      noSpeech: 'Speech is not supported in this browser.',
      noVoice: 'No French voice found on this device. Install one in your system settings.',
      complete: ' complete!', perfect: 'Perfect – no mistakes!', mistakesRound: ' this round.', nextBtn: 'Next set →', again: 'Play again', review: 'Review',
      settings: 'Settings', voice: 'Voice', auto: 'Automatic', speed: 'Speech speed', theme: 'Theme', themeAuto: 'Match device', themeLight: 'Light', themeDark: 'Dark',
      testVoice: 'Test the voice', play: '🔊 Play', voicesN: ' French voice(s) available (★ = natural)', noVoices: 'No French voice detected on this device',
      reset: 'Reset progress', confirmReset: 'Erase all progress on this device?', language: 'App language', close: 'Close',
      about: 'About Mille Mots',
      about1: 'Mille Mots helps you learn the 5,000 most frequently used French words, in sets of 20 (practise everything, or pick nouns, verbs, adjectives and so on), using matching games, spoken pronunciation and example sentences. It works in English or Thai.',
      about2: 'The English and Thai meanings and the sentence translations in this app were written specifically for it. They are short, simple translations meant for learning, not dictionary entries, and may occasionally contain mistakes. If you find one, please use the feedback button to tell the app’s author.',
      ack: 'Acknowledgements',
      about3: 'The choice and order of words was informed by word-frequency counts derived from film and television subtitles (the “FrequencyWords” project by Hermit Dave, based on OpenSubtitles, licensed CC BY-SA 4.0). Only the ranking of words was used. The glosses and sentences are original.',
      about4: 'Pronunciation uses the speech voices built into your device or browser; quality varies. The app does not load any third-party code, fonts or tracking, stores progress only on your device, and works offline once loaded.',
      loadFail: 'Vocabulary data failed to load.', home: 'Home', aboutTitle: 'About', settingsTitle: 'Settings',
      feedbackBtn: 'Feedback', feedbackTitle: 'Send feedback or report a mistake', fbType: 'Type',
      fbMistake: 'Mistake in a word or translation', fbSuggestion: 'Suggestion', fbBug: 'Something is broken',
      fbWord: 'Word concerned (optional)', fbMsg: 'Message', fbPlaceholder: 'Tell us what is wrong, e.g. what the correct translation should be',
      fbSend: '✉ Send by email', fbOpenForm: 'Open the form', fbCopy: 'Copy message', fbCopied: 'Message copied', fbEmpty: 'Please write a message first.',
      fbNoEmail: 'The author has not set up a feedback address yet. Copy the message and send it to the author directly.',
      reportWord: '⚑ Report a problem with this word',
      reviewBtn: 'Review missed words', reviewCount: ' words to review', reviewNone: 'No missed words yet – great!', reviewStart: 'Start review',
      reviewDone: 'Review complete!', reviewLeft: ' words still to review', reviewAllClear: 'No missed words left – well done!', reviewAgain: 'Review again'
    }
  };
  /* ==== END APP CONFIG ==== */

  return { DATA: DATA, CAT_IDS: CAT_IDS, DEFAULT_RATE: DEFAULT_RATE, HW_LANG: HW_LANG, SPEECH_LANG: SPEECH_LANG, VOICE_LANG_RE: VOICE_LANG_RE, TEST_PHRASE: TEST_PHRASE, hw: hw, wkey: wkey, meanLang: meanLang, mean: mean, exTr: exTr, clash: clash, BAD_VOICES: BAD_VOICES, voiceScore: voiceScore, CAT_NAMES: CAT_NAMES, CAT_HINT: CAT_HINT, posLabel: posLabel, STR: STR };
  };
  COURSES.en = function () {
  /* ==== APP CONFIG (Eng 5000) ==== */
  var DATA = window.ENGLISH_DATA || { words: [], cats: {} };
  var CAT_IDS = ['all', 'noun', 'verb', 'adjective', 'adverb', 'preposition', 'other'];
  var STORE_KEY = 'eng5000.v1';
  var OLD_KEY = null;
  var APP_ID = 'eng5000';
  var DEFAULT_RATE = 1;
  var HW_LANG = 'en';
  var SPEECH_LANG = 'en-US';
  var VOICE_LANG_RE = /^en/i;
  var TEST_PHRASE = 'Hello, how are you today?';
  function defaultLang() { return 'th'; }
  function hw(w) { return w.en; }
  function wkey(w) { return w.en + '|' + w.pos; }
  function meanLang() { return 'th'; }
  function mean(w) { return w.th; }
  function exTr(w) { return w.exTh; }
  function tparts(g) {
    var out = {};
    g.split(/[\/,;]/).forEach(function (x) { x = x.replace(/\(.*?\)/g, '').trim(); if (x) out[x] = 1; });
    return out;
  }
  function clash(a, b) {
    if (a.en === b.en) return true;
    var pa = tparts(a.th), pb = tparts(b.th);
    return Object.keys(pa).some(function (k) { return pb[k]; });
  }

  // Novelty / robotic voices that ship with macOS and some browsers: never offer or auto-pick these.
  var BAD_VOICES = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|junior|kathy|organ|ralph|superstar|trinoids|whisper|wobble|zarvox|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|espeak|compact)\b/i;
  // Preferred natural voices, best first (macOS, iOS, Chrome, Edge/Windows, Android).
  var GOOD_VOICES = [/\bsamantha\b/i, /premium|enhanced|natural|neural/i, /\b(ava|samantha|allison|susan|serena|daniel|karen|moira|tessa|oliver|aria|jenny|guy|libby|sonia|ryan)\b/i, /google (us|uk) english/i, /\b(zira|david|mark)\b/i];
  function voiceScore(v) {
    var sc = 0;
    for (var i = 0; i < GOOD_VOICES.length; i++) if (GOOD_VOICES[i].test(v.name)) { sc = 12 - i * 2; break; }
    if (/^en-US/i.test(v.lang)) sc += 2; else if (/^en-GB/i.test(v.lang)) sc += 1;
    if (v.localService === false) sc += 0.5;
    return sc;
  }

  var CAT_NAMES = {
    th: { all: 'ทั้งหมด', noun: 'คำนาม', verb: 'คำกริยา', adjective: 'คำคุณศัพท์', adverb: 'คำกริยาวิเศษณ์', preposition: 'คำบุพบท', other: 'อื่นๆ' },
    en: { all: 'All', noun: 'Nouns', verb: 'Verbs', adjective: 'Adjectives', adverb: 'Adverbs', preposition: 'Prepositions', other: 'Other' }
  };
  var CAT_HINT = {
    th: 'อื่นๆ = สรรพนาม จำนวน ตัวกำหนด สันธาน อุทาน และคำนำหน้านาม',
    en: 'Other = pronouns, numbers, determiners, conjunctions, interjections and articles'
  };
  var POS_TH = { noun: 'นาม', verb: 'กริยา', adjective: 'คุณศัพท์', adverb: 'กริยาวิเศษณ์', preposition: 'บุพบท', pronoun: 'สรรพนาม', number: 'จำนวน', determiner: 'ตัวกำหนด', conjunction: 'สันธาน', interjection: 'อุทาน', article: 'คำนำหน้านาม' };
  function posLabel(p) { return lang() === 'th' && POS_TH[p] ? POS_TH[p] + ' (' + p + ')' : p; }

  var STR = {
    th: {
      appName: 'Eng 5000', pageTitle: 'Eng 5000 – เรียนศัพท์อังกฤษ 5,000 คำ',
      metaDesc: 'เรียนคำศัพท์ภาษาอังกฤษที่ใช้บ่อยที่สุด 5,000 คำ ด้วยเกมจับคู่ เสียงอ่าน และประโยคตัวอย่าง',
      homeTitle: 'เรียนคำศัพท์ภาษาอังกฤษที่ใช้บ่อยที่สุด 5,000 คำ',
      homeIntro: 'จับคู่ทีละ 20 คำ แตะคำอังกฤษเพื่อฟังเสียง และแตะรูปหลอดไฟเพื่อดูประโยคตัวอย่าง',
      voiceHintText: 'เสียงอ่านฟังแปลกๆ ใช่ไหม? ลองเลือกเสียงอื่นในการตั้งค่า (เสียงที่มี ★ ฟังเป็นธรรมชาติกว่า เช่น Samantha)', voiceHintBtn: 'เลือกเสียง', voiceHintClose: 'ไม่ต้องแสดงอีก',
      testMe: 'เลือกหมวดที่จะฝึก',
      nextSet: 'ชุดต่อไป: ชุดที่ ', words: 'คำที่ ', allDone: 'ครบทุกชุดแล้ว!', replayHint: 'เล่นชุดไหนซ้ำก็ได้เพื่อเก็บดาวเพิ่ม',
      cont: 'เรียนต่อ', start: 'เริ่มเลย', replay1: 'เล่นชุดที่ 1 อีกครั้ง',
      setsDone: 'ชุดที่ผ่านแล้ว', wordsPracticed: 'คำที่ฝึกแล้ว', stars: 'ดาว',
      setWord: 'ชุดที่ ', matchedAria: 'คำที่จับคู่แล้ว', matched: 'จับคู่แล้ว', mistake: 'ครั้งที่ผิด',
      autoSpeak: 'อ่านออกเสียงอัตโนมัติ', shuffle: 'สลับใหม่', allSets: 'ทุกชุด',
      listen: 'ฟังเสียง ', hintFor: 'ประโยคตัวอย่างของ ', example: 'ตัวอย่าง', listenWord: '🔊 คำศัพท์', listenSentence: '🔊 ประโยค',
      noSpeech: 'เบราว์เซอร์นี้ไม่รองรับเสียงอ่าน',
      noVoice: 'ไม่พบเสียงภาษาอังกฤษในอุปกรณ์นี้ กรุณาติดตั้งเสียงในการตั้งค่าของเครื่อง',
      complete: ' เสร็จแล้ว!', perfect: 'สมบูรณ์แบบ ไม่มีผิดเลย!', mistakesRound: ' ครั้งในรอบนี้', nextBtn: 'ชุดต่อไป →', again: 'เล่นอีกครั้ง', review: 'ทบทวน',
      settings: 'การตั้งค่า', voice: 'เสียงอ่าน', auto: 'อัตโนมัติ', speed: 'ความเร็วเสียง', theme: 'ธีม', themeAuto: 'ตามอุปกรณ์', themeLight: 'สว่าง', themeDark: 'มืด',
      testVoice: 'ทดสอบเสียง', play: '🔊 เล่น', voicesN: ' เสียงภาษาอังกฤษที่ใช้ได้', noVoices: 'ไม่พบเสียงภาษาอังกฤษในอุปกรณ์นี้',
      reset: 'ล้างความคืบหน้า', confirmReset: 'ลบความคืบหน้าทั้งหมดในอุปกรณ์นี้?', language: 'ภาษาของแอป', close: 'ปิด',
      about: 'เกี่ยวกับ Eng 5000',
      about1: 'Eng 5000 ช่วยให้คนไทยเรียนคำศัพท์ภาษาอังกฤษที่ใช้บ่อยที่สุด 5,000 คำ แบ่งเป็นชุดละ 20 คำ (ฝึกทั้งหมด หรือเลือกเฉพาะคำนาม กริยา คุณศัพท์ ฯลฯ) ผ่านเกมจับคู่ เสียงอ่าน และประโยคตัวอย่าง',
      about2: 'ความหมายภาษาไทยและคำแปลประโยคในแอปนี้เขียนขึ้นเฉพาะสำหรับแอปนี้ เป็นคำแปลสั้นๆ เพื่อการเรียนรู้ ไม่ใช่ความหมายตามพจนานุกรม และอาจมีข้อผิดพลาดได้ หากพบข้อผิดพลาด กรุณากดปุ่มส่งความเห็นเพื่อแจ้งผู้จัดทำแอป',
      ack: 'กิตติกรรมประกาศ',
      about3: 'การเลือกและเรียงลำดับคำอ้างอิงจากสถิติความถี่ของคำในบทบรรยายภาพยนตร์และโทรทัศน์ (โครงการ “FrequencyWords” โดย Hermit Dave อิงข้อมูล OpenSubtitles ใช้สัญญาอนุญาต CC BY-SA 4.0) โดยใช้เฉพาะลำดับของคำเท่านั้น ส่วนความหมายและประโยคเขียนขึ้นใหม่ทั้งหมด',
      about4: 'เสียงอ่านใช้เสียงที่มีอยู่ในอุปกรณ์หรือเบราว์เซอร์ของคุณ คุณภาพอาจแตกต่างกัน แอปนี้ไม่โหลดโค้ด ฟอนต์ หรือระบบติดตามจากภายนอก เก็บความคืบหน้าไว้ในอุปกรณ์ของคุณเท่านั้น และใช้งานแบบออฟไลน์ได้หลังโหลดครั้งแรก',
      loadFail: 'โหลดข้อมูลคำศัพท์ไม่สำเร็จ', home: 'หน้าแรก', aboutTitle: 'เกี่ยวกับ', settingsTitle: 'การตั้งค่า',
      feedbackBtn: 'ส่งความเห็น', feedbackTitle: 'ส่งความเห็นหรือแจ้งข้อผิดพลาด', fbType: 'ประเภท',
      fbMistake: 'พบข้อผิดพลาดในคำศัพท์หรือคำแปล', fbSuggestion: 'ข้อเสนอแนะ', fbBug: 'แอปทำงานผิดปกติ',
      fbWord: 'คำที่เกี่ยวข้อง (ถ้ามี)', fbMsg: 'ข้อความ', fbPlaceholder: 'เล่าให้เราฟังได้เลย เช่น คำแปลที่ถูกควรเป็นอะไร',
      fbSend: '✉ ส่งอีเมล', fbOpenForm: 'เปิดแบบฟอร์ม', fbCopy: 'คัดลอกข้อความ', fbCopied: 'คัดลอกข้อความแล้ว', fbEmpty: 'กรุณาพิมพ์ข้อความก่อน',
      fbNoEmail: 'ผู้จัดทำยังไม่ได้ตั้งค่าที่อยู่รับความเห็น กรุณาคัดลอกข้อความแล้วส่งให้ผู้จัดทำโดยตรง',
      reportWord: '⚑ แจ้งปัญหาคำนี้',
      reviewBtn: 'ทบทวนคำที่พลาด', reviewCount: ' คำรอทบทวน', reviewNone: 'ยังไม่มีคำที่พลาด เยี่ยมมาก!', reviewStart: 'เริ่มทบทวน',
      reviewDone: 'ทบทวนเสร็จแล้ว!', reviewLeft: ' คำยังต้องทบทวนต่อ', reviewAllClear: 'ไม่เหลือคำที่พลาดแล้ว เก่งมาก!', reviewAgain: 'ทบทวนอีกรอบ'
    },
    en: {
      appName: 'Eng 5000', pageTitle: 'Eng 5000 – Learn 5,000 English words',
      metaDesc: 'Learn the 5,000 most common English words with matching games, speech and example sentences.',
      homeTitle: 'Learn the 5,000 most common English words',
      homeIntro: 'Match 20 words at a time. Tap an English word to hear it, and tap the light bulb for an example sentence.',
      voiceHintText: 'Does the voice sound odd? Pick another one in Settings (voices marked ★ sound more natural, e.g. Samantha).', voiceHintBtn: 'Pick a voice', voiceHintClose: 'Don’t show again',
      testMe: 'Choose what to practise',
      nextSet: 'Next: set ', words: 'Words ', allDone: 'All sets complete!', replayHint: 'Replay any set to improve your stars.',
      cont: 'Continue', start: 'Start', replay1: 'Replay set 1',
      setsDone: 'sets completed', wordsPracticed: 'words practised', stars: 'stars',
      setWord: 'Set ', matchedAria: 'Matched words', matched: 'matched', mistake: 'mistake',
      autoSpeak: 'Auto-speak', shuffle: 'Shuffle', allSets: 'All sets',
      listen: 'Listen to ', hintFor: 'Example sentence for ', example: 'Example', listenWord: '🔊 Word', listenSentence: '🔊 Sentence',
      noSpeech: 'Speech is not supported in this browser.',
      noVoice: 'No English voice found on this device. Install one in your system settings.',
      complete: ' complete!', perfect: 'Perfect – no mistakes!', mistakesRound: ' this round.', nextBtn: 'Next set →', again: 'Play again', review: 'Review',
      settings: 'Settings', voice: 'Voice', auto: 'Automatic', speed: 'Speech speed', theme: 'Theme', themeAuto: 'Match device', themeLight: 'Light', themeDark: 'Dark',
      testVoice: 'Test the voice', play: '🔊 Play', voicesN: ' English voice(s) available', noVoices: 'No English voice detected on this device',
      reset: 'Reset progress', confirmReset: 'Erase all progress on this device?', language: 'App language', close: 'Close',
      about: 'About Eng 5000',
      about1: 'Eng 5000 helps Thai speakers learn the 5,000 most frequently used English words, in sets of 20 (practise everything, or pick nouns, verbs, adjectives and so on), using matching games, spoken pronunciation and example sentences.',
      about2: 'The Thai meanings and the sentence translations in this app were written specifically for it. They are short, simple translations meant for learning, not dictionary entries, and may occasionally contain mistakes. If you find one, please use the feedback button to tell the app’s author.',
      ack: 'Acknowledgements',
      about3: 'The choice and order of words was informed by word-frequency counts derived from film and television subtitles (the “FrequencyWords” project by Hermit Dave, based on OpenSubtitles, licensed CC BY-SA 4.0). Only the ranking of words was used. The meanings and sentences are original.',
      about4: 'Pronunciation uses the speech voices built into your device or browser; quality varies. The app does not load any third-party code, fonts or tracking, stores progress only on your device, and works offline once loaded.',
      loadFail: 'Vocabulary data failed to load.', home: 'Home', aboutTitle: 'About', settingsTitle: 'Settings',
      feedbackBtn: 'Feedback', feedbackTitle: 'Send feedback or report a mistake', fbType: 'Type',
      fbMistake: 'Mistake in a word or translation', fbSuggestion: 'Suggestion', fbBug: 'Something is broken',
      fbWord: 'Word concerned (optional)', fbMsg: 'Message', fbPlaceholder: 'Tell us what is wrong, e.g. what the correct translation should be',
      fbSend: '✉ Send by email', fbOpenForm: 'Open the form', fbCopy: 'Copy message', fbCopied: 'Message copied', fbEmpty: 'Please write a message first.',
      fbNoEmail: 'The author has not set up a feedback address yet. Copy the message and send it to the author directly.',
      reportWord: '⚑ Report a problem with this word',
      reviewBtn: 'Review missed words', reviewCount: ' words to review', reviewNone: 'No missed words yet – great!', reviewStart: 'Start review',
      reviewDone: 'Review complete!', reviewLeft: ' words still to review', reviewAllClear: 'No missed words left – well done!', reviewAgain: 'Review again'
    }
  };
  /* ==== END APP CONFIG ==== */

  return { DATA: DATA, CAT_IDS: CAT_IDS, DEFAULT_RATE: DEFAULT_RATE, HW_LANG: HW_LANG, SPEECH_LANG: SPEECH_LANG, VOICE_LANG_RE: VOICE_LANG_RE, TEST_PHRASE: TEST_PHRASE, hw: hw, wkey: wkey, meanLang: meanLang, mean: mean, exTr: exTr, clash: clash, BAD_VOICES: BAD_VOICES, voiceScore: voiceScore, CAT_NAMES: CAT_NAMES, CAT_HINT: CAT_HINT, posLabel: posLabel, STR: STR };
  };

  var COURSE_CACHE = {};
  function useCourse(id) {
    var c = COURSE_CACHE[id] || (COURSE_CACHE[id] = COURSES[id]());
    COURSE = id;
    DATA = c.DATA; CAT_IDS = c.CAT_IDS; DEFAULT_RATE = c.DEFAULT_RATE; HW_LANG = c.HW_LANG; SPEECH_LANG = c.SPEECH_LANG;
    VOICE_LANG_RE = c.VOICE_LANG_RE; TEST_PHRASE = c.TEST_PHRASE; hw = c.hw; wkey = c.wkey; meanLang = c.meanLang; mean = c.mean;
    exTr = c.exTr; clash = c.clash; BAD_VOICES = c.BAD_VOICES; voiceScore = c.voiceScore; CAT_NAMES = c.CAT_NAMES; CAT_HINT = c.CAT_HINT;
    posLabel = c.posLabel; STR = c.STR; APP_ID = 'frequency5000/' + id;
    if (!c.branded) {
      c.branded = true;
      ['th', 'en'].forEach(function (l) {
        Object.keys(STR[l]).forEach(function (k) {
          if (typeof STR[l][k] === 'string') STR[l][k] = STR[l][k].replace(/Mille Mots|Eng 5000/g, BRAND);
        });
      });
    }
    WORDS = DATA.words;
    BYKEY = {};
    WORDS.forEach(function (w) { BYKEY[wkey(w)] = w; });
    loadCourseStore(id);
    refreshVoices();
  }
  function loadCourseData(id, done) {
    if (window[COURSE_META[id].data]) { done(true); return; }
    var s = document.createElement('script');
    s.src = COURSE_META[id].file;
    s.onload = function () { done(true); };
    s.onerror = function () { done(false); };
    document.head.appendChild(s);
  }
  var WORDS = [], BYKEY = {};

  /* ---------- tiny helpers ---------- */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function $(id) { return document.getElementById(id); }
  function shuffle(a) {
    var r = a.slice();
    for (var i = r.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }

  /* ---------- storage (always guarded) ---------- */
  // One saved blob: shared UI settings + a slot per course (progress, missed words, voice, speed, category).
  var RAW_KEY = 'frequency5000.v1';
  var LEGACY = { fr: 'millemots.v2', en: 'eng5000.v1' };   // the two stand-alone apps (same site origin, so we can import them)
  var memoryRaw = null;
  function navLang() {
    var l = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
    return l.indexOf('th') === 0 ? 'th' : 'en';
  }
  function emptySlot() { return { sets: {}, missed: {}, s: {} }; }
  function defaultRaw() {
    return { ui: { theme: 'auto', lang: navLang(), autoSpeak: true, course: navLang() === 'th' ? 'en' : 'fr' }, courses: { fr: emptySlot(), en: emptySlot() } };
  }
  function importLegacy(raw) {
    var firstUi = true;
    COURSE_IDS.forEach(function (id) {
      try {
        var old = JSON.parse(window.localStorage.getItem(LEGACY[id]) || 'null');
        if (!old || typeof old !== 'object') return;
        var sl = raw.courses[id];
        if (old.sets && typeof old.sets === 'object') sl.sets = old.sets;
        var s = old.settings || {};
        ['rate', 'voice', 'cat', 'voiceHint'].forEach(function (k) { if (s[k] !== undefined) sl.s[k] = s[k]; });
        if (firstUi) {
          firstUi = false;
          ['theme', 'autoSpeak'].forEach(function (k) { if (s[k] !== undefined) raw.ui[k] = s[k]; });
          if (id === 'en' && s.lang) raw.ui.lang = s.lang;
        }
      } catch (e) { /* ignore */ }
    });
  }
  function loadRaw() {
    var raw = defaultRaw();
    try {
      var txt = window.localStorage.getItem(RAW_KEY);
      if (txt) {
        var p = JSON.parse(txt);
        if (p && typeof p === 'object') {
          if (p.ui && typeof p.ui === 'object') Object.keys(raw.ui).forEach(function (k) { if (p.ui[k] !== undefined) raw.ui[k] = p.ui[k]; });
          COURSE_IDS.forEach(function (id) {
            var q = p.courses && p.courses[id];
            if (q && typeof q === 'object') {
              if (q.sets && typeof q.sets === 'object') raw.courses[id].sets = q.sets;
              if (q.missed && typeof q.missed === 'object') raw.courses[id].missed = q.missed;
              if (q.s && typeof q.s === 'object') raw.courses[id].s = q.s;
            }
          });
        }
      } else {
        importLegacy(raw);
      }
    } catch (e) { if (memoryRaw) raw = memoryRaw; }
    if (COURSE_IDS.indexOf(raw.ui.course) < 0) raw.ui.course = 'fr';
    return raw;
  }
  var RAW = loadRaw();
  var store = null;   // runtime view of the ACTIVE course: {sets, missed, settings:{...}}
  function loadCourseStore(id) {
    var sl = RAW.courses[id];
    var st = { sets: sl.sets, missed: sl.missed, settings: { autoSpeak: RAW.ui.autoSpeak, rate: DEFAULT_RATE, theme: RAW.ui.theme, voice: '', lang: RAW.ui.lang, cat: 'all', voiceHint: true, pics: true, picsOnly: false } };
    Object.keys(sl.s).forEach(function (k) { if (sl.s[k] !== undefined && k in st.settings) st.settings[k] = sl.s[k]; });
    store = st;
  }
  function saveStore() {
    var sl = RAW.courses[COURSE], s = store.settings;
    sl.sets = store.sets; sl.missed = store.missed;
    sl.s = { rate: s.rate, voice: s.voice, cat: s.cat, voiceHint: s.voiceHint, pics: s.pics, picsOnly: s.picsOnly };
    RAW.ui = { theme: s.theme, lang: s.lang, autoSpeak: s.autoSpeak, course: COURSE };
    memoryRaw = RAW;
    try { window.localStorage.setItem(RAW_KEY, JSON.stringify(RAW)); } catch (e) { /* ignore */ }
  }

  /* ---------- language ---------- */
  function lang() { return store.settings.lang === 'en' ? 'en' : 'th'; }
  function t(k) { return STR[lang()][k]; }
  var FLAG_TH = '<svg viewBox="0 0 30 20" width="26" height="17" preserveAspectRatio="none" aria-hidden="true"><rect width="30" height="20" fill="#A51931"/><rect y="3.33" width="30" height="13.34" fill="#F4F5F8"/><rect y="6.67" width="30" height="6.66" fill="#2D2A4A"/></svg>';
  var FLAG_GB = '<svg viewBox="0 0 60 30" width="26" height="17" preserveAspectRatio="none" aria-hidden="true"><rect width="60" height="30" fill="#012169"/><path d="M0 0L60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" stroke-width="2"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>';
  function applyLang() {
    document.documentElement.setAttribute('lang', lang());
    // the flag shows the language you will switch TO
    var to = lang() === 'th' ? 'en' : 'th';
    var b = $('btnLang');
    b.innerHTML = to === 'en' ? FLAG_GB : FLAG_TH;
    b.setAttribute('aria-label', to === 'en' ? 'English' : 'ภาษาไทย');
    b.title = to === 'en' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย';
    $('btnFeedback').setAttribute('aria-label', t('feedbackBtn'));
    $('btnFeedback').title = t('feedbackBtn');
    $('btnHome').setAttribute('aria-label', t('home'));
    $('btnSettings').setAttribute('aria-label', t('settingsTitle'));
    $('btnSettings').title = t('settingsTitle');
    $('btnAbout').setAttribute('aria-label', t('aboutTitle'));
    $('btnAbout').title = t('aboutTitle');
    $('sheetClose').setAttribute('aria-label', t('close'));
    document.querySelector('.brand-text').textContent = t('appName');
    document.title = t('pageTitle');
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', t('metaDesc'));
  }
  function switchCourse(id) {
    if (id === COURSE) return;
    saveStore();
    loadCourseData(id, function (ok) {
      if (!ok) { toast(t('loadFail')); return; }
      useCourse(id); saveStore(); applyLang();
      if (!$('sheet').hidden) closeSheet();
      go('#/');
    });
  }
  function toggleLang() {
    store.settings.lang = lang() === 'th' ? 'en' : 'th';
    saveStore(); applyLang();
    if (!$('sheet').hidden) closeSheet();
    render();
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    var th = store.settings.theme;
    if (th === 'light' || th === 'dark') document.documentElement.setAttribute('data-theme', th);
    else document.documentElement.removeAttribute('data-theme');
  }

  /* ---------- speech ---------- */
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  var voices = [];
  function refreshVoices() {
    if (!synth) return;
    voices = (synth.getVoices() || []).filter(function (v) { return VOICE_LANG_RE.test(v.lang) && !BAD_VOICES.test(v.name); })
      .sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
  }
  if (synth) {
    refreshVoices();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', refreshVoices);
    else synth.onvoiceschanged = refreshVoices;
  }
  function pickVoice() {
    if (!voices.length) return null;
    var wanted = store.settings.voice;
    if (wanted) {
      for (var i = 0; i < voices.length; i++) if (voices[i].voiceURI === wanted) return voices[i];
    }
    // Automatic: only a known-natural voice; otherwise let the browser use its own default.
    return voiceScore(voices[0]) >= 4 ? voices[0] : null;
  }
  var warnedNoVoice = false;
  function speak(text) {
    if (!synth) { toast(t('noSpeech')); return; }
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = SPEECH_LANG;
      u.rate = Number(store.settings.rate) || 0.9;
      var v = pickVoice();
      if (v) u.voice = v;
      else if (!warnedNoVoice && !voices.length && synth.getVoices().length) {
        warnedNoVoice = true;
        toast(t('noVoice'));
      }
      synth.speak(u);
    } catch (e) { /* ignore */ }
  }

  /* ---------- categories ---------- */
  function catLabel(c) {
    if (c.indexOf('th_') === 0) return THEME_UI[lang()].names[c.slice(3)] || c;
    return CAT_NAMES[lang()][c];
  }
  function isTheme(c) { return c.indexOf('th_') === 0; }
  function themeIds() { return (DATA.themes || []).map(function (x) { return 'th_' + x; }); }
  function curCat() { var c = store.settings.cat; return DATA.cats[c] ? c : 'all'; }
  function catSets() { return DATA.cats[curCat()] || []; }
  function totalSets() { return catSets().length; }
  function getSet(n) { return catSets()[n - 1].map(function (i) { return WORDS[i]; }); }
  function setStart(n) { var sets = catSets(), c = 1; for (var k = 0; k < n - 1; k++) c += sets[k].length; return c; }
  function setEnd(n) { return setStart(n) + catSets()[n - 1].length - 1; }
  function catWordCount(c) { var n = 0, sets = DATA.cats[c] || []; for (var k = 0; k < sets.length; k++) n += sets[k].length; return n; }
  /* ---------- pictures ---------- */
  function needsSvg(w) { return !!(w.p && w.p.charAt(0) !== '#'); }
  function withPics(words, cb) {
    if (window.PICS || store.settings.pics === false || !words.some(needsSvg)) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'pics.js';
    s.onload = cb; s.onerror = cb;
    document.head.appendChild(s);
  }
  function picNode(w, big) {
    if (!w.p || store.settings.pics === false) return null;
    if (w.p.charAt(0) === '#') {
      var txt = w.p.slice(1);
      return h('span', { class: 'pic pic-text' + (txt.length > 3 ? ' long' : ''), 'aria-hidden': 'true', text: txt });
    }
    var svg = window.PICS && window.PICS[w.p];
    if (!svg) return null;
    var sp = h('span', { class: 'pic' + (big ? ' big' : ''), 'aria-hidden': 'true' });
    sp.innerHTML = svg;   // our own bundled SVG artwork (pics.js)
    return sp;
  }
  function skey(n) { return curCat() === 'all' ? String(n) : curCat() + ':' + n; }

  /* ---------- missed words ---------- */
  function missedList() {
    var out = [];
    Object.keys(store.missed).forEach(function (k) { if (BYKEY[k]) out.push({ w: BYKEY[k], n: store.missed[k] }); });
    return out;
  }
  function missedCount() { return missedList().length; }
  function noteMiss(w) { var k = wkey(w); store.missed[k] = (store.missed[k] || 0) + 1; }
  function clearMiss(w) { delete store.missed[wkey(w)]; }
  function pickReview() {
    var list = missedList();
    list.forEach(function (it) { it.r = Math.random(); });
    list.sort(function (a, b) { return (b.n - a.n) || (a.r - b.r); });
    var out = [];
    list.forEach(function (it) {
      if (out.length >= 20) return;
      for (var i = 0; i < out.length; i++) if (clash(out[i], it.w)) return;
      out.push(it.w);
    });
    return out;
  }

  /* ---------- toast & sheet ---------- */
  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3500);
  }
  var lastFocus = null;
  function openSheet(nodes) {
    var body = $('sheetBody');
    body.textContent = '';
    nodes.forEach(function (n) { body.appendChild(n); });
    lastFocus = document.activeElement;
    $('sheet').hidden = false;
    $('sheetClose').focus();
  }
  function closeSheet() {
    $('sheet').hidden = true;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  }
  $('sheetClose').addEventListener('click', closeSheet);
  $('sheet').addEventListener('click', function (e) { if (e.target === $('sheet')) closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('sheet').hidden) closeSheet();
  });

  function showWordSheet(w) {
    openSheet([
      h('h2', { id: 'sheetTitle', text: t('example') }),
      h('div', { class: 'big-hw', lang: HW_LANG, text: hw(w) }),
      h('div', { class: 'muted', lang: meanLang(), text: posLabel(w.pos) + ' · ' + mean(w) }),
      h('p', { class: 'sentence', lang: HW_LANG, text: w.ex }),
      h('p', { class: 'muted', lang: meanLang(), text: exTr(w) }),
      h('div', { class: 'row' }, [
        h('button', { class: 'btn small', onclick: function () { speak(hw(w)); } }, [t('listenWord')]),
        h('button', { class: 'btn small', onclick: function () { speak(w.ex); } }, [t('listenSentence')]),
        h('button', { class: 'btn small', onclick: function () { openFeedback(w); } }, [t('reportWord')])
      ])
    ]);
  }

  /* ---------- feedback ---------- */
  function openFeedback(w) {
    var cfg = window.APP_CONFIG || {};
    var type = h('select', { id: 'fbType', 'aria-label': t('fbType') }, [
      h('option', { value: 'mistake', text: t('fbMistake') }),
      h('option', { value: 'suggestion', text: t('fbSuggestion') }),
      h('option', { value: 'bug', text: t('fbBug') })
    ]);
    var word = h('input', { type: 'text', id: 'fbWord', 'aria-label': t('fbWord'), maxlength: '120', value: w ? (hw(w) + ' (' + w.pos + ')') : '' });
    var msg = h('textarea', { id: 'fbMsg', rows: '5', maxlength: '2000', 'aria-label': t('fbMsg'), placeholder: t('fbPlaceholder') });
    function compose() {
      var lines = [
        t('fbType') + ': ' + type.options[type.selectedIndex].text,
        t('fbWord') + ': ' + (word.value || '-'),
        '',
        msg.value,
        '',
        '--',
        APP_ID + ' / ui=' + lang()
      ];
      return lines.join('\n');
    }
    function check() { if (!msg.value.trim()) { toast(t('fbEmpty')); msg.focus(); return false; } return true; }
    var copy = h('button', { class: 'btn small', type: 'button', onclick: function () {
      if (!check()) return;
      var text = compose();
      function done() { toast(t('fbCopied')); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { msg.select(); });
      else { msg.value = text; msg.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } }
    } }, [t('fbCopy')]);
    var send = null;
    if (cfg.feedbackEmail) {
      send = h('button', { class: 'btn small primary', type: 'button', onclick: function () {
        if (!check()) return;
        window.location.href = 'mailto:' + cfg.feedbackEmail + '?subject=' + encodeURIComponent('[' + APP_ID + '] ' + type.options[type.selectedIndex].text) + '&body=' + encodeURIComponent(compose());
      } }, [t('fbSend')]);
    } else if (cfg.feedbackUrl) {
      send = h('button', { class: 'btn small primary', type: 'button', onclick: function () {
        if (!check()) return;
        window.open(cfg.feedbackUrl, '_blank', 'noopener');
      } }, [t('fbOpenForm')]);
    }
    openSheet([
      h('h2', { id: 'sheetTitle', text: t('feedbackTitle') }),
      h('div', { class: 'field col-field' }, [h('label', { 'for': 'fbType', text: t('fbType') }), type]),
      h('div', { class: 'field col-field' }, [h('label', { 'for': 'fbWord', text: t('fbWord') }), word]),
      h('div', { class: 'field col-field' }, [h('label', { 'for': 'fbMsg', text: t('fbMsg') }), msg]),
      h('div', { class: 'row' }, [send, copy]),
      (send ? null : h('p', { class: 'muted small-note', text: t('fbNoEmail') }))
    ]);
  }

  /* ---------- progress helpers ---------- */
  function setInfo(n) { return store.sets[skey(n)] || null; }
  function doneCount() {
    var c = 0;
    for (var n = 1; n <= totalSets(); n++) if (setInfo(n) && setInfo(n).stars > 0) c++;
    return c;
  }
  function starTotal() {
    var c = 0;
    for (var n = 1; n <= totalSets(); n++) { var i = setInfo(n); if (i) c += i.stars || 0; }
    return c;
  }
  function wordsDone() {
    var c = 0;
    for (var n = 1; n <= totalSets(); n++) if (setInfo(n) && setInfo(n).stars > 0) c += catSets()[n - 1].length;
    return c;
  }
  function nextSetNumber() {
    for (var n = 1; n <= totalSets(); n++) { var i = setInfo(n); if (!i || !i.stars) return n; }
    return null;
  }
  function wordRange(a, b) { return t('words') + a + '–' + b; }
  function mistakeText(m) {
    return lang() === 'th' ? m + ' ' + t('mistake') : m + (m === 1 ? ' mistake' : ' mistakes');
  }

  /* ---------- views ---------- */
  var app = $('app');

  function render() {
    var hash = window.location.hash || '#/';
    if (hash === '#/review' && missedCount() > 0) { renderReview(); return; }
    var m = hash.match(/^#\/set\/(\d+)$/);
    if (m) {
      var n = parseInt(m[1], 10);
      if (n >= 1 && n <= totalSets()) { renderSet(n); return; }
    }
    renderHome();
  }
  function go(hash) {
    if (window.location.hash === hash) render(); else window.location.hash = hash;
  }
  window.addEventListener('hashchange', render);

  function renderHome() {
    if (synth && synth.cancel) { try { synth.cancel(); } catch (e) { /* ignore */ } }
    document.title = t('pageTitle');
    var done = doneCount();
    var next = nextSetNumber();
    var root = h('div');
    var cui = COURSE_UI[lang()];
    var cs = h('div', { class: 'cat-menu course-switch', role: 'group', 'aria-label': cui.label });
    COURSE_IDS.forEach(function (id) {
      cs.appendChild(h('button', { class: 'chip course-chip', type: 'button', lang: id === 'fr' ? (lang() === 'th' ? 'th' : 'en') : (lang() === 'th' ? 'th' : 'en'), 'aria-pressed': String(id === COURSE), onclick: function () { switchCourse(id); } }, [cui[id]]));
    });
    root.appendChild(h('div', { class: 'course-wrap' }, [h('div', { class: 'range-label', style: 'margin-top:0', text: cui.label }), cs]));
    root.appendChild(h('h1', { text: t('homeTitle') }));
    root.appendChild(h('p', { class: 'muted', text: t('homeIntro') }));

    if (synth && store.settings.voiceHint) {
      root.appendChild(h('div', { class: 'card hint-banner', role: 'note' }, [
        h('span', { text: '🔊 ' + t('voiceHintText') }),
        h('div', { class: 'row' }, [
          h('button', { class: 'btn small primary', onclick: function () { openSettings(); } }, [t('voiceHintBtn')]),
          h('button', { class: 'btn small', onclick: function () { store.settings.voiceHint = false; saveStore(); renderHome(); } }, [t('voiceHintClose')])
        ])
      ]));
    }
    var menu = h('div', { class: 'cat-menu', role: 'group', 'aria-label': t('testMe') });
    CAT_IDS.forEach(function (c) {
      menu.appendChild(h('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(curCat() === c),
        onclick: function () { store.settings.cat = c; saveStore(); renderHome(); }
      }, [catLabel(c), h('small', { text: catWordCount(c).toLocaleString('en-US') })]));
    });
    var tmenu = h('div', { class: 'cat-menu theme-menu', role: 'group', 'aria-label': THEME_UI[lang()].menu });
    themeIds().forEach(function (c) {
      tmenu.appendChild(h('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(curCat() === c),
        onclick: function () { store.settings.cat = c; saveStore(); renderHome(); }
      }, [catLabel(c), h('small', { text: catWordCount(c).toLocaleString('en-US') })]));
    });
    root.appendChild(h('div', { class: 'cat-wrap' }, [
      h('div', { class: 'range-label', style: 'margin-top:4px', text: t('testMe') }), menu,
      curCat() === 'other' ? h('p', { class: 'muted small-note', text: CAT_HINT[lang()] }) : null
    ]));
    root.appendChild(h('div', { class: 'cat-wrap' }, [
      h('div', { class: 'range-label', style: 'margin-top:4px', text: THEME_UI[lang()].menu }), tmenu,
      h('p', { class: 'muted small-note', text: isTheme(curCat()) ? THEME_UI[lang()].freqNote : THEME_UI[lang()].hint })
    ]));

    root.appendChild(h('div', { class: 'card hero' }, [
      h('div', {}, [
        h('b', { text: next ? (t('nextSet') + next) : t('allDone') }),
        h('div', { class: 'muted', text: next ? wordRange(setStart(next), setEnd(next)) : t('replayHint') })
      ]),
      h('button', { class: 'btn primary', onclick: function () { go('#/set/' + (next || 1)); } }, [next ? (done ? t('cont') : t('start')) : t('replay1')])
    ]));

    var mc = missedCount();
    root.appendChild(h('div', { class: 'card hero review-card' }, [
      h('div', {}, [
        h('b', { text: t('reviewBtn') }),
        h('div', { class: 'muted', text: mc ? (mc + t('reviewCount')) : t('reviewNone') })
      ]),
      mc ? h('button', { class: 'btn primary', onclick: function () { go('#/review'); } }, [t('reviewStart')]) : null
    ]));

    root.appendChild(h('div', { class: 'stats' }, [
      h('div', { class: 'card stat' }, [h('b', { text: done + ' / ' + totalSets() }), h('span', { text: t('setsDone') })]),
      h('div', { class: 'card stat' }, [h('b', { text: String(wordsDone()) }), h('span', { text: t('wordsPracticed') })]),
      h('div', { class: 'card stat' }, [h('b', { text: String(starTotal()) }), h('span', { text: t('stars') })])
    ]));

    for (var start = 1; start <= totalSets(); start += 10) {
      var end = Math.min(start + 9, totalSets());
      root.appendChild(h('div', { class: 'range-label', text: wordRange(setStart(start), setEnd(end)) }));
      var grid = h('div', { class: 'grid' });
      for (var n = start; n <= end; n++) {
        (function (n) {
          var info = setInfo(n);
          var cls = 'tile-set' + (info && info.stars ? ' done' : '') + (n === next ? ' next' : '');
          var stars = info && info.stars ? '★'.repeat(info.stars) : '';
          grid.appendChild(h('button', {
            class: cls,
            'aria-label': t('setWord') + n + (info && info.stars ? ', ' + info.stars + ' ' + t('stars') : ''),
            onclick: function () { go('#/set/' + n); }
          }, [String(n), h('small', { text: stars || ' ' })]));
        })(n);
      }
      root.appendChild(grid);
    }
    app.textContent = '';
    app.appendChild(root);
    window.scrollTo(0, 0);
  }

  /* ---------- game ---------- */
  function renderSet(n) {
    var words = getSet(n);
    document.title = t('setWord') + n + ' – ' + t('appName');
    withPics(words, function () {
      if (window.location.hash !== '#/set/' + n) return;
      playGame({
        words: words, review: false, n: n,
        title: t('setWord') + n,
        sub: catLabel(curCat()) + ' · ' + wordRange(setStart(n), setEnd(n)),
        again: function () { renderSet(n); }
      });
    });
  }
  function renderReview() {
    var words = pickReview();
    document.title = t('reviewBtn') + ' – ' + t('appName');
    withPics(words, function () {
      playGame({
        words: words, review: true, n: 0,
        title: t('reviewBtn'),
        sub: words.length + t('reviewCount'),
        again: function () { go('#/review'); }
      });
    });
  }

  function playGame(cfg) {
    var words = cfg.words;
    var order = shuffle(words.map(function (_, i) { return i; }));
    var orderR = shuffle(words.map(function (_, i) { return i; }));
    var matched = {}, missedNow = {};
    var matchedCount = 0;
    var mistakes = 0;
    var selL = null, selR = null, busy = false;
    var tilesL = {}, tilesR = {};

    var title = h('h1', { text: cfg.title });
    var sub = h('div', { class: 'muted', text: cfg.sub });
    var barFill = h('i');
    var bar = h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(words.length), 'aria-valuenow': '0', 'aria-label': t('matchedAria') }, [barFill]);
    var counter = h('span', { class: 'muted', text: '' });

    var autoBtn = h('button', {
      class: 'btn small toggle', 'aria-pressed': String(!!store.settings.autoSpeak),
      onclick: function () {
        store.settings.autoSpeak = !store.settings.autoSpeak; saveStore();
        autoBtn.setAttribute('aria-pressed', String(!!store.settings.autoSpeak));
      }
    }, ['🔊 ' + t('autoSpeak')]);
    var hasPics = store.settings.pics !== false && words.some(function (w) { return !!picNode(w); });
    var picsOnly = hasPics && !!store.settings.picsOnly;
    var picsBtn = hasPics ? h('button', {
      class: 'btn small toggle', 'aria-pressed': String(!!store.settings.picsOnly),
      onclick: function () { store.settings.picsOnly = !store.settings.picsOnly; saveStore(); cfg.again(); }
    }, [THEME_UI[lang()].picsOnlyShort]) : null;
    var restartBtn = h('button', { class: 'btn small', onclick: function () { cfg.again(); } }, ['↻ ' + t('shuffle')]);
    var backBtn = h('button', { class: 'btn small', onclick: function () { go('#/'); } }, ['← ' + t('allSets')]);

    var colL = h('div', { class: 'col', lang: HW_LANG });
    var colR = h('div', { class: 'col', lang: meanLang() });

    order.forEach(function (i) {
      var w = words[i];
      var main = h('button', { class: 'tile-main', type: 'button', 'aria-pressed': 'false' }, [
        h('span', { class: 'label', text: hw(w) }),
        h('span', { class: 'pos', text: posLabel(w.pos) })
      ]);
      var listen = h('button', {
        class: 'mini', type: 'button', 'aria-label': t('listen') + hw(w), title: t('listen'),
        onclick: function (e) { e.stopPropagation(); speak(hw(w)); }
      }, ['🔊']);
      var hint = h('button', {
        class: 'mini', type: 'button', 'aria-label': t('hintFor') + hw(w), title: t('example'),
        onclick: function (e) { e.stopPropagation(); showWordSheet(w); }
      }, ['💡']);
      var tile = h('div', { class: 'tile' }, [main, listen, hint]);
      tile.mainBtn = main;
      main.addEventListener('click', function () { pick('L', i); });
      tilesL[i] = tile;
      colL.appendChild(tile);
    });
    orderR.forEach(function (i) {
      var w = words[i];
      var pn = picNode(w, picsOnly);
      var onlyPic = picsOnly && !!pn;
      var tile = h('button', { class: 'tile' + (pn ? ' has-pic' : '') + (onlyPic ? ' pic-only' : ''), 'aria-pressed': 'false', 'aria-label': onlyPic ? mean(w) : null }, [pn, onlyPic ? null : h('span', { class: 'label', text: mean(w) })]);
      tile.addEventListener('click', function () { pick('R', i); });
      tilesR[i] = tile;
      colR.appendChild(tile);
    });

    function mark(tile, cls, on) {
      tile.classList[on ? 'add' : 'remove'](cls);
      if (cls === 'sel') (tile.mainBtn || tile).setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function updateStatus() {
      barFill.style.width = (matchedCount / words.length * 100) + '%';
      bar.setAttribute('aria-valuenow', String(matchedCount));
      counter.textContent = matchedCount + ' / ' + words.length + ' ' + t('matched') + ' · ' + mistakeText(mistakes);
    }

    function pick(side, i) {
      if (busy || matched[i]) return;
      if (side === 'L') {
        if (store.settings.autoSpeak) speak(hw(words[i]));
        if (selL === i) { mark(tilesL[i], 'sel', false); selL = null; return; }
        if (selL !== null) mark(tilesL[selL], 'sel', false);
        selL = i; mark(tilesL[i], 'sel', true);
      } else {
        if (selR === i) { mark(tilesR[i], 'sel', false); selR = null; return; }
        if (selR !== null) mark(tilesR[selR], 'sel', false);
        selR = i; mark(tilesR[i], 'sel', true);
      }
      if (selL !== null && selR !== null) evaluate();
    }

    function evaluate() {
      var l = selL, r = selR;
      if (l === r) {
        matched[l] = true; matchedCount++;
        if (!missedNow[l]) { clearMiss(words[l]); saveStore(); }   // got it right first time: no longer "missed"
        [tilesL[l], tilesR[l]].forEach(function (x) { mark(x, 'sel', false); mark(x, 'matched', true); });
        tilesR[l].disabled = true;
        tilesL[l].mainBtn.disabled = true;
        selL = selR = null;
        updateStatus();
        if (matchedCount === words.length) setTimeout(finish, 600);
      } else {
        mistakes++;
        busy = true;
        // both words involved are ones the learner is unsure about
        [l, r].forEach(function (k) { if (!missedNow[k]) { missedNow[k] = true; noteMiss(words[k]); } });
        saveStore();
        [tilesL[l], tilesR[r]].forEach(function (x) { mark(x, 'wrong', true); });
        updateStatus();
        setTimeout(function () {
          [tilesL[l], tilesR[r]].forEach(function (x) { mark(x, 'wrong', false); mark(x, 'sel', false); });
          selL = selR = null; busy = false;
        }, 450);
      }
    }

    function finish() {
      var stars = mistakes === 0 ? 3 : (mistakes <= 3 ? 2 : 1);
      if (!cfg.review) {
        var prev = setInfo(cfg.n) || { stars: 0, best: null, plays: 0 };
        store.sets[skey(cfg.n)] = {
          stars: Math.max(prev.stars || 0, stars),
          best: prev.best === null || prev.best === undefined ? mistakes : Math.min(prev.best, mistakes),
          plays: (prev.plays || 0) + 1
        };
      }
      saveStore();
      renderResult(cfg, mistakes, stars);
    }

    updateStatus();
    var root = h('div', {}, [
      h('div', { class: 'game-head' }, [h('div', {}, [title, sub]), backBtn]),
      bar,
      h('div', { class: 'toolbar' }, [counter]),
      h('div', { class: 'toolbar' }, [autoBtn, picsBtn, restartBtn]),
      h('div', { class: 'cols' }, [colL, colR])
    ]);
    app.textContent = '';
    app.appendChild(root);
    window.scrollTo(0, 0);
  }

  function renderResult(cfg, mistakes, stars) {
    var words = cfg.words;
    var n = cfg.n;
    var next = !cfg.review && n < totalSets() ? n + 1 : null;
    var list = h('ul', { class: 'word-list' });
    words.forEach(function (w) {
      list.appendChild(h('li', {}, [
        h('div', { class: 'w' }, [
          h('div', {}, [picNode(w), h('span', { class: 'hw', lang: HW_LANG, text: hw(w) }), ' – ', h('span', { lang: meanLang(), text: mean(w) })]),
          h('div', { class: 'ex', lang: HW_LANG, text: w.ex }),
          h('div', { class: 'ex', lang: meanLang(), text: exTr(w) })
        ]),
        h('div', { class: 'row-tight' }, [
          h('button', { class: 'mini btn', 'aria-label': t('listen') + hw(w), onclick: function () { speak(hw(w)); } }, ['🔊']),
          h('button', { class: 'mini btn', 'aria-label': t('reportWord'), title: t('reportWord'), onclick: function () { openFeedback(w); } }, ['⚑'])
        ])
      ]));
    });
    var msg = mistakes === 0 ? t('perfect') : (lang() === 'th' ? 'ผิด ' + mistakes + t('mistakesRound') : mistakeText(mistakes) + t('mistakesRound'));
    var left = missedCount();
    var buttons;
    var head;
    if (cfg.review) {
      head = [
        h('h1', { text: t('reviewDone') }),
        h('p', { class: 'muted', text: msg }),
        h('p', { class: 'muted', text: left ? (left + t('reviewLeft')) : t('reviewAllClear') })
      ];
      buttons = h('div', { class: 'row', style: 'justify-content:center' }, [
        left ? h('button', { class: 'btn primary', onclick: function () { go('#/review'); } }, [t('reviewAgain')]) : null,
        h('button', { class: 'btn', onclick: function () { go('#/'); } }, [t('allSets')])
      ]);
    } else {
      head = [
        h('h1', { text: t('setWord') + n + t('complete') }),
        h('div', { class: 'stars', 'aria-label': stars + ' ' + t('stars'), text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
        h('p', { class: 'muted', text: msg }),
        left ? h('p', { class: 'muted', text: left + t('reviewCount') }) : null
      ];
      buttons = h('div', { class: 'row', style: 'justify-content:center' }, [
        next ? h('button', { class: 'btn primary', onclick: function () { go('#/set/' + next); } }, [t('nextBtn')]) : null,
        left ? h('button', { class: 'btn', onclick: function () { go('#/review'); } }, [t('reviewBtn')]) : null,
        h('button', { class: 'btn', onclick: function () { cfg.again(); } }, [t('again')]),
        h('button', { class: 'btn', onclick: function () { go('#/'); } }, [t('allSets')])
      ]);
    }
    var root = h('div', { class: 'result' }, head.concat([buttons, h('h2', { text: t('review') }), list]));
    app.textContent = '';
    app.appendChild(root);
    window.scrollTo(0, 0);
  }

  /* ---------- settings & about ---------- */
  function openSettings() {
    refreshVoices();
    var voiceSel = h('select', { id: 'voiceSel', 'aria-label': t('voice') });
    voiceSel.appendChild(h('option', { value: '', text: t('auto') }));
    voices.forEach(function (v) {
      var o = h('option', { value: v.voiceURI, text: (voiceScore(v) >= 4 ? '★ ' : '') + v.name + ' (' + v.lang + ')' });
      if (store.settings.voice === v.voiceURI) o.selected = true;
      voiceSel.appendChild(o);
    });
    voiceSel.addEventListener('change', function () { store.settings.voice = voiceSel.value; store.settings.voiceHint = false; saveStore(); });

    var rate = h('input', { type: 'range', min: '0.5', max: '1.2', step: '0.05', value: String(store.settings.rate), 'aria-label': t('speed') });
    rate.addEventListener('input', function () { store.settings.rate = parseFloat(rate.value); saveStore(); });

    var theme = h('select', { 'aria-label': t('theme') }, [
      h('option', { value: 'auto', text: t('themeAuto') }),
      h('option', { value: 'light', text: t('themeLight') }),
      h('option', { value: 'dark', text: t('themeDark') })
    ]);
    theme.value = store.settings.theme;
    theme.addEventListener('change', function () { store.settings.theme = theme.value; saveStore(); applyTheme(); });

    function setLang(l) {
      store.settings.lang = l; saveStore(); applyLang(); render(); openSettings();
    }
    var langSw = h('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Language / ภาษา' }, [
      h('button', { class: 'btn small', 'aria-pressed': String(lang() === 'th'), lang: 'th', onclick: function () { setLang('th'); } }, ['ไทย']),
      h('button', { class: 'btn small', 'aria-pressed': String(lang() === 'en'), lang: 'en', onclick: function () { setLang('en'); } }, ['English'])
    ]);

    var picToggle = h('button', {
      class: 'btn small toggle', 'aria-pressed': String(store.settings.pics !== false),
      onclick: function () { store.settings.pics = store.settings.pics === false; saveStore(); picToggle.setAttribute('aria-pressed', String(store.settings.pics !== false)); }
    }, [THEME_UI[lang()].showPics]);
    var reset = h('button', {
      class: 'btn small',
      onclick: function () {
        if (window.confirm(t('confirmReset'))) {
          store.sets = {}; store.missed = {}; saveStore(); closeSheet(); render();
        }
      }
    }, [t('reset')]);

    openSheet([
      h('h2', { id: 'sheetTitle', text: t('settings') }),
      h('div', { class: 'field' }, [h('label', { text: t('language') }), langSw]),
      h('div', { class: 'field' }, [h('label', { text: t('voice') }), voiceSel]),
      h('div', { class: 'field' }, [h('label', { text: t('speed') }), rate]),
      h('div', { class: 'field' }, [h('label', { text: t('theme') }), theme]),
      h('div', { class: 'field' }, [h('span', { text: '🖼' }), picToggle]),
      h('div', { class: 'field' }, [h('span', { text: t('testVoice') }), h('button', { class: 'btn small', onclick: function () { speak(TEST_PHRASE); } }, [t('play')])]),
      h('div', { class: 'field' }, [h('span', { class: 'muted', text: voices.length ? voices.length + t('voicesN') : t('noVoices') }), reset])
    ]);
  }

  function openAbout() {
    openSheet([
      h('h2', { id: 'sheetTitle', text: t('about') }),
      h('div', { class: 'about' }, [
        h('p', { text: t('about1') }),
        h('p', { text: t('about2') }),
        h('h2', { text: t('ack') }),
        h('p', { text: t('about3') }),
        h('p', { text: t('about4') }),
        h('p', { class: 'muted', text: THEME_UI[lang()].credit + ' ' }, [h('a', { href: 'https://creativecommons.org/licenses/by/4.0/', target: '_blank', rel: 'noopener', text: 'creativecommons.org/licenses/by/4.0' })])
      ])
    ]);
  }

  $('btnHome').addEventListener('click', function () { go('#/'); });
  $('btnSettings').addEventListener('click', openSettings);
  $('btnAbout').addEventListener('click', openAbout);
  $('btnLang').addEventListener('click', toggleLang);
  $('btnFeedback').addEventListener('click', function () { openFeedback(null); });

  /* ---------- boot ---------- */
  loadCourseData(RAW.ui.course, function (ok) {
    if (!ok) { app.textContent = 'Vocabulary data failed to load.'; return; }
    useCourse(RAW.ui.course);
    applyTheme();
    applyLang();
    render();
  });

  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
    });
  }
})();
