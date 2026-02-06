import { CardData, ContentDB, Language } from './types';

// Mocking assets/data/cards_kr.json
export const MOCK_CARDS_KR: CardData[] = [
  { id: 1, type: "D", keyword: "기록하기", img: "card_01_D_records.png", desc: "자료를 기록하고 정리하는 것을 좋아합니다." },
  { id: 2, type: "I", keyword: "아이디어", img: "card_02_I_ideas.png", desc: "새로운 생각을 떠올리고 상상하는 것을 좋아합니다." },
  { id: 3, type: "P", keyword: "도와주기", img: "card_03_P_help.png", desc: "친구들의 고민을 들어주고 돕는 것을 좋아합니다." },
  { id: 4, type: "T", keyword: "만들기", img: "card_04_T_make.png", desc: "손으로 물건을 조립하거나 만드는 것을 좋아합니다." },
  { id: 5, type: "D", keyword: "분석하기", img: "card_05_D_analyze.png", desc: "숫자나 정보를 꼼꼼하게 따져보는 것을 좋아합니다." },
  { id: 6, type: "T", keyword: "기계 다루기", img: "card_06_T_machine.png", desc: "도구나 기계를 사용하여 작업하는 것을 좋아합니다." },
  { id: 7, type: "I", keyword: "연구하기", img: "card_07_I_research.png", desc: "궁금한 것을 깊이 파고들어 연구하는 것을 좋아합니다." },
  { id: 8, type: "P", keyword: "가르치기", img: "card_08_P_teach.png", desc: "다른 사람에게 지식을 알려주는 것을 좋아합니다." },
  { id: 9, type: "D", keyword: "계산하기", img: "card_09_D_calc.png", desc: "돈이나 수치를 정확하게 계산하는 것을 좋아합니다." },
  { id: 10, type: "T", keyword: "운전/조종", img: "card_10_T_drive.png", desc: "자동차나 드론 등을 조종하는 것을 좋아합니다." },
  { id: 11, type: "I", keyword: "관찰하기", img: "card_11_I_observe.png", desc: "사물이나 자연을 자세히 관찰하는 것을 좋아합니다." },
  { id: 12, type: "P", keyword: "상담하기", img: "card_12_P_counsel.png", desc: "사람들의 마음을 위로하고 대화하는 것을 좋아합니다." }
];

// Mocking assets/data/cards_en.json
export const MOCK_CARDS_EN: CardData[] = [
  { id: 1, type: "D", keyword: "Recording", img: "card_01_D_records.png", desc: "Likes recording and organizing data." },
  { id: 2, type: "I", keyword: "Ideas", img: "card_02_I_ideas.png", desc: "Likes imagining and coming up with new ideas." },
  { id: 3, type: "P", keyword: "Helping", img: "card_03_P_help.png", desc: "Likes listening to friends' problems and helping them." },
  { id: 4, type: "T", keyword: "Making", img: "card_04_T_make.png", desc: "Likes assembling or making things by hand." },
  { id: 5, type: "D", keyword: "Analyzing", img: "card_05_D_analyze.png", desc: "Likes meticulously checking numbers or information." },
  { id: 6, type: "T", keyword: "Handling Machines", img: "card_06_T_machine.png", desc: "Likes working with tools or machines." },
  { id: 7, type: "I", keyword: "Researching", img: "card_07_I_research.png", desc: "Likes digging deep into questions." },
  { id: 8, type: "P", keyword: "Teaching", img: "card_08_P_teach.png", desc: "Likes teaching knowledge to others." },
  { id: 9, type: "D", keyword: "Calculating", img: "card_09_D_calc.png", desc: "Likes calculating money or figures accurately." },
  { id: 10, type: "T", keyword: "Driving", img: "card_10_T_drive.png", desc: "Likes operating vehicles or drones." },
  { id: 11, type: "I", keyword: "Observing", img: "card_11_I_observe.png", desc: "Likes observing nature or objects in detail." },
  { id: 12, type: "P", keyword: "Counseling", img: "card_12_P_counsel.png", desc: "Likes comforting people and having conversations." }
];

// Mocking assets/data/contents_db_kr.json
export const CONTENT_DB_KR: ContentDB = {
  "DATA_THINGS": {
    title: "현실적인 분석가형",
    summary: "논리적이고 체계적이며, 구체적인 사물이나 도구를 다루는 데 능숙합니다.",
    jobs: ["엔지니어", "회계사", "데이터 분석가", "건축가"],
    traits: "객관적인 데이터와 실재하는 도구를 활용하여 문제를 해결하는 것을 선호합니다."
  },
  "DATA_PEOPLE": {
    title: "체계적인 관리자형",
    summary: "사람들과 함께 일하면서도 규칙과 질서를 중요하게 생각합니다.",
    jobs: ["행정가", "은행원", "비서", "학교 행정실장"],
    traits: "조직을 체계적으로 관리하고 다른 사람들을 지원하는 역할을 잘 수행합니다."
  },
  "IDEAS_THINGS": {
    title: "창의적인 탐구자형",
    summary: "새로운 아이디어를 구체적인 결과물로 만들어내는 것을 좋아합니다.",
    jobs: ["과학자", "소프트웨어 개발자", "발명가", "기술 연구원"],
    traits: "호기심이 많고 독창적이며, 기술적인 도구를 활용해 혁신을 만듭니다."
  },
  "IDEAS_PEOPLE": {
    title: "열정적인 예술가/교육자형",
    summary: "자유로운 상상력을 바탕으로 사람들과 소통하고 영감을 줍니다.",
    jobs: ["예술가", "심리 상담사", "교사", "마케터"],
    traits: "감수성이 풍부하고 다른 사람의 성장을 돕거나 자신을 표현하는 일을 즐깁니다."
  },
  "UNKNOWN": {
    title: "균형 잡힌 탐험가",
    summary: "다양한 분야에 고루 흥미를 가지고 있습니다.",
    jobs: ["기획자", "컨설턴트"],
    traits: "여러 분야를 융합하는 능력이 잠재되어 있습니다."
  }
};

// Mocking assets/data/contents_db_en.json
export const CONTENT_DB_EN: ContentDB = {
  "DATA_THINGS": {
    title: "Realistic Analyst",
    summary: "Logical, systematic, and skilled at handling concrete objects or tools.",
    jobs: ["Engineer", "Accountant", "Data Analyst", "Architect"],
    traits: "Prefers solving problems using objective data and tangible tools."
  },
  "DATA_PEOPLE": {
    title: "Systematic Administrator",
    summary: "Values rules and order while working with people.",
    jobs: ["Administrator", "Banker", "Executive Assistant", "School Manager"],
    traits: "Good at organizing systems and supporting others within a structure."
  },
  "IDEAS_THINGS": {
    title: "Creative Investigator",
    summary: "Likes turning new ideas into concrete results.",
    jobs: ["Scientist", "Software Developer", "Inventor", "Researcher"],
    traits: "Curious and original, creating innovation through technical tools."
  },
  "IDEAS_PEOPLE": {
    title: "Passionate Artist/Educator",
    summary: "Communicates and inspires people based on free imagination.",
    jobs: ["Artist", "Counselor", "Teacher", "Marketer"],
    traits: "Sensitive and enjoys helping others grow or expressing oneself."
  },
  "UNKNOWN": {
    title: "Balanced Explorer",
    summary: "Shows balanced interest across various fields.",
    jobs: ["Planner", "Consultant"],
    traits: "Has potential to converge multiple disciplines."
  }
};

export const getCards = (language: Language): CardData[] => {
  return language === Language.KR ? MOCK_CARDS_KR : MOCK_CARDS_EN;
};

export const getContent = (language: Language): ContentDB => {
  return language === Language.KR ? CONTENT_DB_KR : CONTENT_DB_EN;
};

export const ASSET_IMAGES_PATH = "assets/images";
