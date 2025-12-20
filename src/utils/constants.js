export const SUBJECTS = [
  '数学', '英語', '現代文', '古典', '物理', '化学', '生物', 
  '化学基礎', '生物基礎', '日本史', '世界史', '地理', '政治経済', '情報'
];

export const TASKS = [
  '課題', 'テスト訂正', '小テスト勉強', 
  '授業の復習', '予習', '過去問演習'
];

export const TARGET_HOURS = 3776;

export const SUBJECT_GROUPS = {
  common: ['現代文', '古典', '数学', '英語', '地理', '情報'],
  bunken: ['化学基礎', '生物基礎', '政治経済'],
  bunkenHistory: ['日本史', '世界史'],
  riken: ['化学'],
  rikenScience: ['物理', '生物']
};

export const getDefaultSubjects = (type, historyChoice = '日本史', scienceChoice = '物理') => {
  const subjects = [...SUBJECT_GROUPS.common];
  
  if (type === 'bunken') {
    subjects.push(...SUBJECT_GROUPS.bunken);
    subjects.push(historyChoice);
  } else {
    subjects.push(...SUBJECT_GROUPS.riken);
    subjects.push(scienceChoice);
  }
  
  return subjects;
};
