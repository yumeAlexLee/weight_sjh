// 100g あたりの栄養素 + 1単位のグラム数
// { kcal, protein, fat, carb, unitGrams }
const TABLE = [
  // 肉
  { names: ['鶏むね', '鶏胸', 'チキンブレスト', '鸡胸', '鸡胸肉'], kcal: 108, protein: 22.3, fat: 1.5, carb: 0, unitGrams: 150 },
  { names: ['鶏もも', '鶏腿'], kcal: 190, protein: 16.6, fat: 14.0, carb: 0, unitGrams: 150 },
  { names: ['鶏ささみ', 'ささみ'], kcal: 98, protein: 23.0, fat: 0.8, carb: 0, unitGrams: 70 },
  { names: ['豚ロース', '豚ロース肉', '猪肉'], kcal: 263, protein: 19.3, fat: 19.2, carb: 0.2, unitGrams: 150 },
  { names: ['豚バラ', '豚バラ肉'], kcal: 395, protein: 14.4, fat: 35.4, carb: 0.1, unitGrams: 150 },
  { names: ['牛もも', '牛モモ', '牛肉'], kcal: 182, protein: 21.3, fat: 10.7, carb: 0.3, unitGrams: 150 },
  { names: ['牛カルビ', 'カルビ', '牛バラ'], kcal: 316, protein: 14.0, fat: 28.3, carb: 0.3, unitGrams: 150 },
  { names: ['牛ヒレ', '牛フィレ'], kcal: 207, protein: 20.5, fat: 15.0, carb: 0.3, unitGrams: 150 },
  { names: ['ひき肉', '合挽き', '合いびき', '豚ひき', '牛ひき', '鶏ひき'], kcal: 224, protein: 17.7, fat: 17.2, carb: 0.1, unitGrams: 100 },
  // 魚
  { names: ['鮭', 'サーモン', '鮭の切り身'], kcal: 133, protein: 22.3, fat: 4.1, carb: 0.1, unitGrams: 100 },
  { names: ['さば', 'サバ', '鯖'], kcal: 211, protein: 20.6, fat: 16.8, carb: 0.3, unitGrams: 100 },
  { names: ['まぐろ', 'マグロ', '鮪', 'ツナ'], kcal: 125, protein: 26.4, fat: 1.4, carb: 0.1, unitGrams: 100 },
  { names: ['えび', 'エビ', '海老'], kcal: 83, protein: 18.4, fat: 0.3, carb: 0.1, unitGrams: 100 },
  { names: ['ツナ缶', 'シーチキン'], kcal: 71, protein: 16.0, fat: 0.7, carb: 0.1, unitGrams: 70 },
  { names: ['さば缶', 'サバ缶'], kcal: 190, protein: 20.9, fat: 10.7, carb: 0.2, unitGrams: 190 },
  // 卵・大豆
  { names: ['卵', '玉子', 'たまご', '鶏卵', 'ゆで卵', '鸡蛋'], kcal: 151, protein: 12.3, fat: 10.3, carb: 0.3, unitGrams: 60 },
  { names: ['木綿豆腐', '木綿'], kcal: 72, protein: 7.0, fat: 4.3, carb: 1.5, unitGrams: 300 },
  { names: ['絹ごし豆腐', '絹豆腐', '豆腐'], kcal: 56, protein: 5.3, fat: 3.0, carb: 1.7, unitGrams: 300 },
  { names: ['納豆'], kcal: 200, protein: 16.5, fat: 10.0, carb: 12.1, unitGrams: 45 },
  { names: ['豆乳'], kcal: 46, protein: 3.6, fat: 2.0, carb: 3.1, unitGrams: 200 },
  // 主食
  { names: ['ご飯', '白米', '米飯', '米', '炊いたご飯', '米饭', '白米饭'], kcal: 168, protein: 2.5, fat: 0.3, carb: 36.8, unitGrams: 150 },
  { names: ['玄米'], kcal: 165, protein: 2.8, fat: 1.0, carb: 34.2, unitGrams: 150 },
  { names: ['食パン', 'パン'], kcal: 264, protein: 9.3, fat: 4.4, carb: 46.7, unitGrams: 60 },
  { names: ['うどん'], kcal: 68, protein: 2.0, fat: 0.6, carb: 12.4, unitGrams: 500 },
  { names: ['そば', '蕎麦'], kcal: 86, protein: 3.4, fat: 0.6, carb: 15.7, unitGrams: 350 },
  { names: ['ラーメン', '拉麺', '醤油ラーメン', '味噌ラーメン', '豚骨ラーメン', '塩ラーメン'], kcal: 94, protein: 4.4, fat: 2.8, carb: 13.0, unitGrams: 500 },
  { names: ['中華麺', '生麺', '面条'], kcal: 149, protein: 4.9, fat: 2.1, carb: 29.2, unitGrams: 200 },
  { names: ['パスタ', 'スパゲッティ'], kcal: 177, protein: 5.7, fat: 6.3, carb: 24.3, unitGrams: 350 },
  { names: ['おにぎり'], kcal: 168, protein: 2.7, fat: 0.3, carb: 37.1, unitGrams: 110 },
  { names: ['弁当', 'お弁当'], kcal: 155, protein: 5.0, fat: 4.5, carb: 24.0, unitGrams: 450 },
  // 野菜
  { names: ['ブロッコリー'], kcal: 33, protein: 4.3, fat: 0.5, carb: 5.2, unitGrams: 100 },
  { names: ['ほうれん草', 'ほうれんそう'], kcal: 20, protein: 2.2, fat: 0.4, carb: 3.1, unitGrams: 100 },
  { names: ['キャベツ'], kcal: 23, protein: 1.3, fat: 0.2, carb: 5.2, unitGrams: 100 },
  { names: ['トマト'], kcal: 19, protein: 0.7, fat: 0.1, carb: 4.7, unitGrams: 150 },
  { names: ['きゅうり', 'キュウリ'], kcal: 14, protein: 1.0, fat: 0.1, carb: 3.0, unitGrams: 100 },
  { names: ['レタス'], kcal: 12, protein: 0.6, fat: 0.1, carb: 2.8, unitGrams: 100 },
  { names: ['にんじん', 'ニンジン', '人参'], kcal: 39, protein: 0.7, fat: 0.1, carb: 9.3, unitGrams: 100 },
  { names: ['玉ねぎ', 'タマネギ', '玉葱'], kcal: 37, protein: 1.0, fat: 0.1, carb: 8.8, unitGrams: 150 },
  { names: ['もやし'], kcal: 15, protein: 1.7, fat: 0.1, carb: 2.6, unitGrams: 100 },
  { names: ['きのこ', 'シイタケ', 'しいたけ', 'えのき', 'エノキ', 'しめじ'], kcal: 22, protein: 3.0, fat: 0.4, carb: 6.4, unitGrams: 100 },
  { names: ['青菜', '小松菜', 'チンゲン菜', '小白菜', '菜心'], kcal: 14, protein: 1.5, fat: 0.1, carb: 2.4, unitGrams: 100 },
  { names: ['白菜', 'はくさい', 'ハクサイ', '大白菜'], kcal: 13, protein: 0.8, fat: 0.1, carb: 3.2, unitGrams: 100 },
  { names: ['じゃがいも', 'ジャガイモ', 'じゃが芋', '土豆'], kcal: 76, protein: 2.0, fat: 0.1, carb: 17.0, unitGrams: 150 },
  // 果物
  { names: ['バナナ'], kcal: 86, protein: 1.1, fat: 0.2, carb: 22.5, unitGrams: 100 },
  { names: ['りんご', 'リンゴ', '林檎'], kcal: 61, protein: 0.2, fat: 0.2, carb: 15.5, unitGrams: 200 },
  { names: ['みかん', 'ミカン', '蜜柑'], kcal: 46, protein: 0.7, fat: 0.1, carb: 11.5, unitGrams: 100 },
  { names: ['いちご', 'イチゴ', '苺'], kcal: 34, protein: 0.9, fat: 0.1, carb: 8.5, unitGrams: 150 },
  { names: ['ぶどう', 'ブドウ', '葡萄'], kcal: 69, protein: 0.4, fat: 0.1, carb: 17.9, unitGrams: 100 },
  // 乳製品
  { names: ['牛乳', '全乳', 'ミルク'], kcal: 67, protein: 3.3, fat: 3.8, carb: 4.8, unitGrams: 200 },
  { names: ['ヨーグルト', 'プレーンヨーグルト'], kcal: 62, protein: 3.6, fat: 3.0, carb: 4.9, unitGrams: 100 },
  { names: ['チーズ', 'スライスチーズ', 'プロセスチーズ'], kcal: 339, protein: 22.7, fat: 26.0, carb: 1.3, unitGrams: 20 },
  { names: ['プロテイン', 'ホエイプロテイン'], kcal: 380, protein: 75.0, fat: 4.0, carb: 10.0, unitGrams: 30 },
  // コンビニ
  { names: ['サラダチキン'], kcal: 108, protein: 23.0, fat: 1.3, carb: 0.1, unitGrams: 115 },
  { names: ['チキンバー'], kcal: 180, protein: 14.0, fat: 9.0, carb: 10.0, unitGrams: 85 },
  { names: ['おでん'], kcal: 60, protein: 4.5, fat: 1.5, carb: 7.0, unitGrams: 200 },
  { names: ['カップ麺', 'カップラーメン', 'カップヌードル'], kcal: 350, protein: 9.5, fat: 14.0, carb: 44.0, unitGrams: 85 },
  { names: ['からあげ', '唐揚げ', 'フライドチキン'], kcal: 307, protein: 18.4, fat: 20.5, carb: 11.0, unitGrams: 100 },
  // 外食
  { names: ['牛丼'], kcal: 673, protein: 23.0, fat: 18.0, carb: 94.0, unitGrams: 435 },
  { names: ['カレー', 'カレーライス'], kcal: 578, protein: 14.5, fat: 16.5, carb: 87.0, unitGrams: 400 },
  { names: ['ハンバーガー'], kcal: 256, protein: 13.0, fat: 9.0, carb: 31.0, unitGrams: 130 },
  { names: ['寿司', 'すし', '回転寿司'], kcal: 150, protein: 7.0, fat: 2.5, carb: 25.0, unitGrams: 110 },
  { names: ['焼肉'], kcal: 290, protein: 18.0, fat: 20.0, carb: 5.0, unitGrams: 200 },
  { names: ['唐揚げ定食'], kcal: 820, protein: 32.0, fat: 24.0, carb: 110.0, unitGrams: 550 },
  // コーヒー・飲み物（kcal≒0）
  { names: ['コーヒー', '珈琲', 'ブラックコーヒー'], kcal: 4, protein: 0.2, fat: 0, carb: 0.7, unitGrams: 150 },
  { names: ['緑茶', 'お茶', '麦茶'], kcal: 2, protein: 0, fat: 0, carb: 0.4, unitGrams: 200 },
  { names: ['水'], kcal: 0, protein: 0, fat: 0, carb: 0, unitGrams: 200 },
  { names: ['サラダ', 'グリーンサラダ'], kcal: 15, protein: 0.8, fat: 0.2, carb: 3.0, unitGrams: 100 },
];

// 単位→グラム変換（N個/N杯/N枚/N本/N食）
const COUNTER_UNITS = ['個', '杯', '枚', '本', '食', '皿', '切れ', '人前'];

function findEntry(name) {
  const lower = name.toLowerCase();
  for (const entry of TABLE) {
    for (const alias of entry.names) {
      if (lower.includes(alias.toLowerCase()) || alias.toLowerCase().includes(lower)) {
        return entry;
      }
    }
  }
  return null;
}

function parseGrams(token) {
  // 150g / 150ｇ / 150グラム
  const gramMatch = token.match(/(\d+(?:\.\d+)?)\s*(?:g|ｇ|グラム)/i);
  if (gramMatch) return { grams: parseFloat(gramMatch[1]), unit: 'g' };
  // N個/N杯 etc
  for (const u of COUNTER_UNITS) {
    const m = token.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + u));
    if (m) return { count: parseFloat(m[1]), unit: u };
  }
  return null;
}

export function parseFood(text) {
  // トークン分割: 半角・全角スペース、読点
  const tokens = text.split(/[\s　、,，]+/).filter(Boolean);
  const items = [];

  for (const token of tokens) {
    if (!token.trim()) continue;

    // まず食べ物名を探す (数量表記を除いた部分)
    const cleanToken = token.replace(/\d+(?:\.\d+)?[\s]*(g|ｇ|グラム|個|杯|枚|本|食|皿|切れ|人前)/gi, '').trim();
    const entry = findEntry(cleanToken) || findEntry(token);
    const measured = parseGrams(token);

    let grams = 0;
    if (entry) {
      if (measured) {
        if (measured.unit === 'g') {
          grams = measured.grams;
        } else {
          // N個 → N × unitGrams
          grams = measured.count * entry.unitGrams;
        }
      } else {
        let sizeMod = 1.0;
        if (/大盛り?/.test(token) || /大$/.test(token)) sizeMod = 2.0;
        else if (/小盛り?/.test(token) || /小$/.test(token)) sizeMod = 0.75;
        grams = entry.unitGrams * sizeMod;
      }

      const factor = grams / 100;
      items.push({
        name: cleanToken || token,
        grams: Math.round(grams),
        kcal: Math.round(entry.kcal * factor),
        protein: parseFloat((entry.protein * factor).toFixed(1)),
        fat: parseFloat((entry.fat * factor).toFixed(1)),
        carb: parseFloat((entry.carb * factor).toFixed(1)),
      });
    } else if (token.trim()) {
      items.push({ name: token, grams: 0, kcal: 0, protein: 0, fat: 0, carb: 0, unknown: true });
    }
  }

  const total = items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: parseFloat((acc.protein + it.protein).toFixed(1)),
      fat: parseFloat((acc.fat + it.fat).toFixed(1)),
      carb: parseFloat((acc.carb + it.carb).toFixed(1)),
    }),
    { kcal: 0, protein: 0, fat: 0, carb: 0 }
  );

  const hasUnknown = items.some(it => it.unknown);
  const unknownItemNames = items.filter(it => it.unknown).map(it => it.name);
  return hasUnknown ? { items, total, unknown: true, unknownItemNames } : { items, total, unknownItemNames: [] };
}

export function ruleComment(total, target = { kcal: 1700, protein: 100 }) {
  const kcal = Number(total && total.kcal) || 0;
  const protein = Number(total && total.protein) || 0;
  if (kcal === 0 && protein === 0) {
    return 'まだ記録がありません。食べたものを入力してください。';
  }
  const lowProtein = total.protein < target.protein * 0.8;
  const overKcal = total.kcal > target.kcal * 1.2;

  if (lowProtein && overKcal) {
    return 'カロリーは超過気味。蛋白も足りないのでサラダチキン1個か卵2個を追加して、明日の朝食は軽めにしよう。';
  }
  if (lowProtein) {
    return '蛋白が足りない。サラダチキン1個か卵2個を足すと目標に近づく。';
  }
  if (overKcal) {
    return '今日はカロリー超過。明日は朝を軽くすると帳尻が合う。';
  }
  return '今日は良好。バランスが取れている。';
}
