import { parseFood, ruleComment } from '../lib/nutrition.js';

const GITHUB_TOKEN = process.env.GH_TOKEN || '';
const OWNER = 'yumeAlexLee';
const REPO = 'weight_sjh';
const BRANCH = 'main';
const CSV_PATH = 'data/food.csv';
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CSV_PATH}`;
const FOOD_TARGET = { kcal: 1700, protein: 100 };

function todayJST() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

async function getCSV() {
  const res = await fetch(`${API}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return { content: 'date,meal,text,kcal,protein,fat,carb\n', sha: null };
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const data = await res.json();
  return {
    content: Buffer.from(data.content, 'base64').toString('utf-8'),
    sha: data.sha,
  };
}

async function putCSV(content, sha, commitMsg) {
  const body = { message: commitMsg, content: Buffer.from(content).toString('base64'), branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(API, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`);
}

function parseCSVRows(content) {
  const lines = content.split('\n').slice(1); // skip header
  const rows = [];
  for (const line of lines) {
    const clean = line.replace(/\r$/, '').trim();
    if (!clean) continue;
    const cols = clean.split(',');
    if (cols.length < 7) continue;
    rows.push({
      date: cols[0],
      meal: cols[1],
      text: cols[2],
      kcal: parseFloat(cols[3]) || 0,
      protein: parseFloat(cols[4]) || 0,
      fat: parseFloat(cols[5]) || 0,
      carb: parseFloat(cols[6]) || 0,
    });
  }
  return rows;
}

function sumRows(rows) {
  return rows.reduce(
    (acc, r) => ({
      kcal: acc.kcal + r.kcal,
      protein: parseFloat((acc.protein + r.protein).toFixed(1)),
      fat: parseFloat((acc.fat + r.fat).toFixed(1)),
      carb: parseFloat((acc.carb + r.carb).toFixed(1)),
    }),
    { kcal: 0, protein: 0, fat: 0, carb: 0 }
  );
}

async function analyzeWithAI(text) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a nutrition analyzer. Given food text in Japanese or Chinese, return ONLY this JSON:\n{"items":[{"name":"","grams":0,"kcal":0,"protein":0,"fat":0,"carb":0}],"total":{"kcal":0,"protein":0,"fat":0,"carb":0}}\nUse standard Japanese food composition values. Numbers only, no units in values.',
          },
          { role: 'user', content: text },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    if (!parsed.items || !parsed.total) return null;
    return parsed;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { date: rawDate, meal: rawMeal, text: rawText } = req.body || {};
    const date = rawDate || todayJST();
    const meal = rawMeal || '夜';
    const text = (rawText || '').trim();

    if (!text) return res.status(400).json({ success: false, error: 'text は必須です' });

    const safeText = text.replace(/[,\r\n]/g, ' ');

    try {
      // Analyze
      let nutrition = await analyzeWithAI(safeText);
      const source = nutrition ? 'ai' : 'rule';
      if (!nutrition) nutrition = parseFood(safeText);

      const { total } = nutrition;

      // Append to CSV
      const { content, sha } = await getCSV();
      const newRow = `${date},${meal},${safeText},${Math.round(total.kcal)},${total.protein.toFixed(1)},${total.fat.toFixed(1)},${total.carb.toFixed(1)}\n`;
      const newContent = content.endsWith('\n') ? content + newRow : content + '\n' + newRow;
      await putCSV(newContent, sha, `add food: ${date} ${meal}`);

      // Today totals (re-read updated content)
      const allRows = parseCSVRows(newContent);
      const todayRows = allRows.filter(r => r.date === date);
      const todayTotal = sumRows(todayRows);
      const comment = ruleComment(todayTotal, FOOD_TARGET);

      return res.status(200).json({
        success: true,
        entry: { date, meal, text: safeText, ...total },
        today: { ...todayTotal, count: todayRows.length },
        comment,
        source,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'GET') {
    const date = req.query?.date || todayJST();
    try {
      const { content } = await getCSV();
      const allRows = parseCSVRows(content);
      const todayRows = allRows.filter(r => r.date === date);
      const todayTotal = sumRows(todayRows);
      const comment = ruleComment(todayTotal, FOOD_TARGET);

      return res.status(200).json({
        success: true,
        items: todayRows,
        today: { ...todayTotal, count: todayRows.length },
        comment,
        source: 'rule',
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
