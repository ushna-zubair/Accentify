/**
 * Translates ARPAbet phoneme codes (HH, AO, K, AH, …) into short, plain-English
 * descriptors that learners can read without phonetics training.
 *
 * Used by the friendly results view to render "Missed sounds: ah (father),
 * k (key)" instead of "Missed phones: AO, K". The full ARPAbet detail remains
 * available behind the result screen's "Show details" toggle.
 */

const FRIENDLY_NAMES: Record<string, string> = {
  // Vowels
  AA: 'ah (father)',
  AE: 'a (cat)',
  AH: 'uh (cup)',
  AO: 'aw (thought)',
  AW: 'ow (now)',
  AY: 'i (bite)',
  EH: 'e (bed)',
  ER: 'er (bird)',
  EY: 'ay (say)',
  IH: 'i (sit)',
  IY: 'ee (see)',
  OW: 'oh (go)',
  OY: 'oy (boy)',
  UH: 'oo (book)',
  UW: 'oo (food)',

  // Consonants
  B: 'b (boy)',
  CH: 'ch (chair)',
  D: 'd (dog)',
  DH: 'th (this)',
  F: 'f (fan)',
  G: 'g (go)',
  HH: 'h (hat)',
  JH: 'j (jam)',
  K: 'k (key)',
  L: 'l (light)',
  M: 'm (man)',
  N: 'n (nice)',
  NG: 'ng (sing)',
  P: 'p (pen)',
  R: 'r (red)',
  S: 's (sun)',
  SH: 'sh (she)',
  T: 't (top)',
  TH: 'th (thin)',
  V: 'v (van)',
  W: 'w (we)',
  Y: 'y (yes)',
  Z: 'z (zoo)',
  ZH: 'zh (measure)',
};

const stripStress = (token: string): string =>
  token.replace(/\d+$/, '').toUpperCase();

export const friendlySound = (arpabet: string): string => {
  const key = stripStress(arpabet);
  return FRIENDLY_NAMES[key] ?? key.toLowerCase();
};

export const friendlySounds = (tokens: string[]): string[] =>
  tokens.filter(Boolean).map(friendlySound);
