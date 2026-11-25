import { ruleComment } from '../lib/nutrition.js';

const GITHUB_TOKEN = process.env.GH_TOKEN || '';
const OWNER = 'yumeAlexLee';
const REPO = 'weight_sjh';
const BRANCH = 'main';
const ANALYSIS_PATH = 'data/analysis.csv';
const FOOD_PATH = 'data/food.csv';
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;
const FOOD_TARGET = { kcal: 1700, protein: 100 };
const ANALYSIS_HEADER = 'date,verdict,advice,model,updated_at';

function todayJST() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

async function getFile(path) {
  const res = await fetch(`${API_BASE}${path}?ref=${BRANCH}&t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Cache-Control': 'no-cache' },
  });
  if (res.status === 404) return { content: null, sha: null };
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const data = await res.json();
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha };
}

async function putFile(path, content, sha, commitMsg) {
  const body = {
    message: commitMsg,
    content: Buffer.from(content).toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
}

function parseAnalysisCSV(content) {
  if (!content) return {};
  const lines = content.split('\n').slice(1);
  const rows = {};
  for (const line of lines) {
    const clean = line.replace(/\r$/, '').trim();
    if (!clean) continue;
    const cols = clean.split(',');
    if (cols.length < 5) continue;
    rows[cols[0]] = { date: cols[0], verdict: cols[1], advice: cols[2], model: cols[3], updated_at: cols[4] };
  }
  return rows;
}

function upsertAnalysisCSV(content, analysis) {
  const base = content || ANALYSIS_HEADER + '\n';
  const lines = base.split('\n');
  const header = lines[0].replace(/\r$/, '');
  const newRow = `${analysis.date},${analysis.verdict},${analysis.advice},${analysis.model},${analysis.updated_at}`;
  let found = false;
  const newLines = [header];
  for (let i = 1; i < lines.length; i++) {
    const clean = lines[i].replace(/\r$/, '').trim();
    if (!clean) continue;
    const cols = clean.split(',');
    if (cols[0] === analysis.date) {
      newLines.push(newRow);
      found = true;
    } else {
      newLines.push(clean);
    }
  }
  if (!found) newLines.push(newRow);
  return newLines.join('\n') + '\n';
}

function parseFoodCSVRows(content) {
  if (!content) return [];
  const lines = content.split('\n').slice(1);
  const rows = [];
  for (const line of lines) {
    const clean = line.replace(/\r$/, '').trim();
    if (!clean) continue;
    const cols = clean.split(',');
    if (cols.length < 7) continue;
    rows.push({
      date: cols[0], meal: cols[1], text: cols[2],
      kcal: parseFloat(cols[3]) || 0,
      protein: parseFloat(cols[4]) || 0,
    });
  }
  return rows;
}

function ruleAnalysis(total) {
  const kcal = Math.round(total.kcal);
  const protein = Number(total.protein.toFixed(0));
  const lowProtein = total.protein < FOOD_TARGET.protein * 0.8;
  const overKcal = total.kcal > FOOD_TARGET.kcal * 1.2;
  const noData = total.kcal === 0 && total.protein === 0;
  if (noData) return { verdict: '暂无记录', advice: '请记录今日饮食', model: 'rule' };
  if (lowProtein && overKcal) return {
    verdict: `${kcal}kcal 超目标·蛋白 ${protein}g 偏少`,
    advice: `蛋白还差 ${FOOD_TARGET.protein - protein}g，减主食加鸡胸`,
    model: 'rule',
  };
  if (lowProtein) return {
    verdict: `蛋白 ${protein}g 偏少`,
    advice: `蛋白还差 ${FOOD_TARGET.protein - protein}g，加一份鸡胸(150g)`,
    model: 'rule',
  };
  if (overKcal) return {
    verdict: `${kcal}kcal 超目标`,
    advice: `超出 ${kcal - FOOD_TARGET.kcal}kcal，明日减量增蔬菜`,
    model: 'rule',
  };
  return {
    verdict: `${kcal}kcal 均衡`,
    advice: `蛋白 ${protein}g 达标，继续保持`,
    model: 'rule',
  };
}

async function generateAIAnalysis(date, foodRows) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;

  const total = foodRows.reduce(
    (acc, r) => ({ kcal: acc.kcal + r.kcal, protein: acc.protein + r.protein }),
    { kcal: 0, protein: 0 }
  );
  const foodList = foodRows.slice(0, 20).map(r => `${r.text}(${Math.round(r.kcal)}kcal)`).join('、');

  const userMsg = `日期：${date}\n总热量：${Math.round(total.kcal)}kcal（目标${FOOD_TARGET.kcal}kcal）\n蛋白质：${total.protein.toFixed(1)}g（目标${FOOD_TARGET.protein}g）\n食物：${foodList || '无记录'}`;

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
        max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '你是营养分析助手。根据当日饮食，用中文给出精简评价和建议。返回JSON：{"verdict":"≤20字总体评价","advice":"≤60字可执行建议"}。直接说重点。',
          },
          { role: 'user', content: userMsg },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (!parsed.verdict || !parsed.advice) return null;
    return {
      verdict: String(parsed.verdict).slice(0, 20).replace(/,/g, '、'),
      advice: String(parsed.advice).slice(0, 60).replace(/,/g, '、'),
      model: 'deepseek-chat',
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const date = req.query?.date || todayJST();
    try {
      const { content } = await getFile(ANALYSIS_PATH);
      const rows = parseAnalysisCSV(content);
      return res.status(200).json({ success: true, analysis: rows[date] || null });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { date: rawDate, force } = req.body || {};
    const date = rawDate || todayJST();

    try {
      const { content: analysisContent, sha: analysisSha } = await getFile(ANALYSIS_PATH);
      const rows = parseAnalysisCSV(analysisContent);

      if (!force && rows[date]) {
        const cached = rows[date];
        const isRule = cached.model === 'rule';
        const hasAIKey = !!process.env.DEEPSEEK_API_KEY;
        if (!isRule || !hasAIKey) {
          return res.status(200).json({ success: true, analysis: cached, cached: true });
        }
      }

      const { content: foodContent } = await getFile(FOOD_PATH);
      const dayRows = parseFoodCSVRows(foodContent).filter(r => r.date === date);

      let result = await generateAIAnalysis(date, dayRows);
      if (!result) {
        const total = dayRows.reduce(
          (acc, r) => ({ kcal: acc.kcal + r.kcal, protein: acc.protein + r.protein }),
          { kcal: 0, protein: 0 }
        );
        result = ruleAnalysis(total);
      }

      const nowJST = new Date()
        .toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' })
        .replace(' ', 'T') + '+09:00';
      const analysis = { date, ...result, updated_at: nowJST };

      if (result.model !== 'rule') {
        let aContent = analysisContent;
        let aSha = analysisSha;
        const nc = upsertAnalysisCSV(aContent, analysis);
        try {
          await putFile(ANALYSIS_PATH, nc, aSha, `update analysis: ${date}`);
        } catch (putErr) {
          if (putErr.status !== 409) throw putErr;
          ({ content: aContent, sha: aSha } = await getFile(ANALYSIS_PATH));
          await putFile(ANALYSIS_PATH, upsertAnalysisCSV(aContent, analysis), aSha, `update analysis: ${date}`);
        }
      }

      return res.status(200).json({ success: true, analysis, cached: false });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
