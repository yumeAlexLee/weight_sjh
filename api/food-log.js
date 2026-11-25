import { parseFood, ruleComment } from '../lib/nutrition.js';
import { analyzeFoodText } from './food-ai.js';

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

function daysAgoJST(n) {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  d.setDate(d.getDate() - n);
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

async function getCSV() {
  const res = await fetch(`${API}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return { content: 'date,meal,text,kcal,protein,fat,carb\n', sha: null };
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const data = await res.json();
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha };
}

async function putCSV(content, sha, commitMsg) {
  const body = {
    message: commitMsg,
    content: Buffer.from(content).toString('base64'),
    branch: BRANCH,
  };
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
  if (!res.ok) {
    const err = new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
}

function parseCSVRows(content) {
  const lines = content.split('\n').slice(1);
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
      source: cols[7] || undefined,
    });
  }
  return rows;
}

function rowToCSVLine(item) {
  const safeText = (item.text || '').replace(/[,\r\n]/g, ' ');
  return `${item.date},${item.meal},${safeText},${Math.round(item.kcal || 0)},${parseFloat((item.protein || 0).toFixed(1))},${parseFloat((item.fat || 0).toFixed(1))},${parseFloat((item.carb || 0).toFixed(1))},${item.source || 'rule'}`;
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

function buildTotals(preview) {
  const totals = {};
  for (const p of preview) {
    const d = p.date;
    if (!totals[d]) totals[d] = { kcal: 0, protein: 0, count: 0, unknownCount: 0 };
    if (!p.unknown) {
      totals[d].kcal = Math.round(totals[d].kcal + (p.kcal || 0));
      totals[d].protein = parseFloat((totals[d].protein + (p.protein || 0)).toFixed(1));
      totals[d].count++;
    } else {
      totals[d].unknownCount++;
    }
  }
  return totals;
}

function reconstructTextFromEntries(entries) {
  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e.text);
  }
  const lines = [];
  for (const [date, texts] of byDate) {
    const [, m, d] = date.split('-');
    lines.push(`📅${parseInt(m)}/${parseInt(d)}:`);
    for (const t of texts) lines.push(t);
    lines.push('');
  }
  return lines.join('\n').trim();
}

export default async function handler(req, res) {
  // ---- PATCH ----
  if (req.method === 'PATCH') {
    const { date, meal, text, kcal, protein } = req.body || {};
    if (!date || !meal || !text || kcal === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    try {
      const { content, sha } = await getCSV();
      const lines = content.split('\n');
      let found = false;
      const updatedLines = lines.map((line, i) => {
        if (i === 0) return line.replace(/\r$/, '');
        const clean = line.replace(/\r$/, '');
        if (!found && clean.trim()) {
          const cols = clean.split(',');
          if (cols.length >= 7 && cols[0] === date && cols[1] === meal && cols[2] === text) {
            found = true;
            cols[3] = String(Math.round(kcal));
            if (protein !== undefined) cols[4] = parseFloat(protein).toFixed(1);
            while (cols.length < 8) cols.push('');
            cols[7] = 'manual';
            return cols.slice(0, 8).join(',');
          }
        }
        return clean;
      });
      if (!found) return res.status(404).json({ success: false, error: '没有找到这一行' });
      await putCSV(updatedLines.join('\n'), sha, `update food: ${date} ${meal}`);
      return res.status(200).json({
        success: true,
        entry: { date, meal, text, kcal: Math.round(kcal), protein: parseFloat((protein || 0).toFixed(1)), source: 'manual' },
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ---- DELETE ----
  if (req.method === 'DELETE') {
    const { date, meal, text } = req.body || {};
    if (!date || !meal || !text) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    try {
      const { content, sha } = await getCSV();
      const lines = content.split('\n');
      let deleted = false;
      const newLines = [lines[0].replace(/\r$/, '')];
      for (let i = 1; i < lines.length; i++) {
        const clean = lines[i].replace(/\r$/, '');
        if (!deleted && clean.trim()) {
          const cols = clean.split(',');
          if (cols.length >= 3 && cols[0] === date && cols[1] === meal && cols[2] === text) {
            deleted = true;
            continue;
          }
        }
        newLines.push(clean);
      }
      if (!deleted) return res.status(404).json({ success: false, error: '没有找到这一行' });
      await putCSV(newLines.join('\n'), sha, `delete food: ${date} ${meal}`);
      return res.status(200).json({ success: true, deleted: 1 });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ---- GET ----
  if (req.method === 'GET') {
    if (req.query?.days) {
      const n = Math.min(parseInt(req.query.days) || 7, 30);
      try {
        const { content } = await getCSV();
        const allRows = parseCSVRows(content);
        const days = [];
        for (let i = n - 1; i >= 0; i--) {
          const date = daysAgoJST(i);
          const rows = allRows.filter(r => r.date === date);
          days.push({
            date,
            kcal: Math.round(rows.reduce((s, r) => s + r.kcal, 0)),
            protein: parseFloat(rows.reduce((s, r) => s + r.protein, 0).toFixed(1)),
            count: rows.length,
          });
        }
        return res.status(200).json({ success: true, days });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

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
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ---- POST ----
  if (req.method === 'POST') {
    const { entries, dryRun, ai: aiFlag } = req.body || {};

    // ---- batch mode ----
    if (entries && Array.isArray(entries)) {
      if (entries.length > 200) {
        return res.status(400).json({ success: false, error: '一次最多 200 项' });
      }
      const totalTextLen = entries.reduce((s, e) => s + (e.text || '').length, 0);
      if (totalTextLen > 4000) {
        return res.status(400).json({ success: false, error: '内容太长（上限 4000 字）' });
      }

      const today = todayJST();
      const preview = [];
      const toParseEntries = [];

      for (const ent of entries) {
        const safeText = (ent.text || '').trim().replace(/[,\r\n]/g, ' ');
        if (!safeText) continue;
        const entDate = ent.date || today;
        const entMeal = ent.meal || '一括';

        if (ent.kcal !== undefined && ent.kcal !== null) {
          preview.push({
            date: entDate, meal: entMeal, text: safeText,
            kcal: Math.round(Number(ent.kcal)),
            protein: parseFloat(Number(ent.protein || 0).toFixed(1)),
            fat: parseFloat(Number(ent.fat || 0).toFixed(1)),
            carb: parseFloat(Number(ent.carb || 0).toFixed(1)),
            source: ent.source || 'manual',
            unknown: !!ent.unknown,
          });
        } else {
          toParseEntries.push({ date: entDate, meal: entMeal, text: safeText });
        }
      }

      let aiUsed = false;

      if (toParseEntries.length > 0) {
        let aiResult = null;
        if (aiFlag && process.env.DEEPSEEK_API_KEY) {
          const bulkText = reconstructTextFromEntries(toParseEntries);
          aiResult = await analyzeFoodText(bulkText, today);
        }

        if (aiResult && aiResult.items) {
          const inputDates = new Set(toParseEntries.map(e => e.date));
          const allDatesValid = aiResult.items.every(item => inputDates.has(item.date || today));
          if (!allDatesValid) aiResult = null;
        }

        if (aiResult && aiResult.items) {
          aiUsed = true;
          for (const item of aiResult.items) {
            const isUnknown = item.kcal === null || item.kcal === undefined;
            preview.push({
              date: item.date || today,
              meal: item.meal || '一括',
              text: item.name || '',
              kcal: isUnknown ? 0 : Math.round(Number(item.kcal) || 0),
              protein: isUnknown ? 0 : parseFloat(Number(item.protein || 0).toFixed(1)),
              fat: isUnknown ? 0 : parseFloat(Number(item.fat || 0).toFixed(1)),
              carb: isUnknown ? 0 : parseFloat(Number(item.carb || 0).toFixed(1)),
              source: 'ai',
              unknown: isUnknown,
            });
          }
        } else {
          for (const ent of toParseEntries) {
            const nutrition = parseFood(ent.text);
            for (const item of nutrition.items) {
              preview.push({
                date: ent.date, meal: ent.meal,
                text: item.name || ent.text,
                kcal: item.kcal || 0,
                protein: parseFloat((item.protein || 0).toFixed(1)),
                fat: parseFloat((item.fat || 0).toFixed(1)),
                carb: parseFloat((item.carb || 0).toFixed(1)),
                source: 'rule',
                unknown: !!item.unknown,
              });
            }
          }
        }
      }

      const totals = buildTotals(preview);

      if (dryRun) {
        return res.status(200).json({
          success: true, dryRun: true, preview,
          count: preview.length, skipped: 0, aiUsed, totals,
        });
      }

      // dryRun:false → save with dedup
      try {
        function applyPreview(csvContent) {
          const existing = parseCSVRows(csvContent);
          const existingKeys = new Set(existing.map(r => `${r.date}|${r.meal}|${r.text}|${Math.round(r.kcal)}`));
          let nc = csvContent;
          let sv = 0, sk = 0;
          const seen = new Set();
          for (const item of preview) {
            if (item.unknown && !item.kcal) continue;
            const key = `${item.date}|${item.meal}|${item.text}|${Math.round(item.kcal)}`;
            if (existingKeys.has(key) || seen.has(key)) { sk++; continue; }
            seen.add(key);
            const row = rowToCSVLine(item) + '\n';
            nc = nc.endsWith('\n') ? nc + row : nc + '\n' + row;
            sv++;
          }
          return { newContent: nc, saved: sv, skipped: sk };
        }

        let { content, sha } = await getCSV();
        let { newContent, saved, skipped } = applyPreview(content);

        if (saved > 0) {
          try {
            await putCSV(newContent, sha, `add food: bulk ${saved} entries`);
          } catch (putErr) {
            if (putErr.status !== 409) throw putErr;
            ({ content, sha } = await getCSV());
            ({ newContent, saved, skipped } = applyPreview(content));
            if (saved > 0) await putCSV(newContent, sha, `add food: bulk ${saved} entries`);
          }
        }

        return res.status(200).json({
          success: true, dryRun: false, preview,
          count: saved, skipped, aiUsed, totals,
        });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // ---- single entry mode ----
    const { date: rawDate, meal: rawMeal, text: rawText } = req.body || {};
    const date = rawDate || todayJST();
    const meal = rawMeal || '夜';
    const text = (rawText || '').trim();
    if (!text) return res.status(400).json({ success: false, error: '请输入内容' });

    const safeText = text.replace(/[,\r\n]/g, ' ');

    try {
      const aiResult = await analyzeFoodText(safeText, date);
      let source = 'rule';
      let kcal, protein, fat, carb;

      if (aiResult && aiResult.items && aiResult.items.length > 0) {
        const hasAnyKcal = aiResult.items.some(it => it.kcal !== null && it.kcal !== undefined);
        if (hasAnyKcal) {
          source = 'ai';
          const totals = aiResult.items.reduce(
            (acc, it) => ({
              kcal: acc.kcal + (it.kcal || 0),
              protein: acc.protein + (it.protein || 0),
              fat: acc.fat + (it.fat || 0),
              carb: acc.carb + (it.carb || 0),
            }),
            { kcal: 0, protein: 0, fat: 0, carb: 0 }
          );
          kcal = Math.round(totals.kcal);
          protein = parseFloat(totals.protein.toFixed(1));
          fat = parseFloat(totals.fat.toFixed(1));
          carb = parseFloat(totals.carb.toFixed(1));
        }
      }

      if (source === 'rule') {
        const nutrition = parseFood(safeText);
        if (nutrition.unknown === true && nutrition.items.every(it => it.unknown)) {
          return res.status(400).json({
            success: false,
            error: 'この料理は認識できませんでした。材料と量で書いてみてください',
            unknown: nutrition.unknownItemNames || [],
          });
        }
        kcal = Math.round(nutrition.total.kcal);
        protein = parseFloat(nutrition.total.protein.toFixed(1));
        fat = parseFloat(nutrition.total.fat.toFixed(1));
        carb = parseFloat(nutrition.total.carb.toFixed(1));
      }

      let { content, sha } = await getCSV();
      const newRow = `${date},${meal},${safeText},${kcal},${protein},${fat},${carb},${source}\n`;
      let newContent = content.endsWith('\n') ? content + newRow : content + '\n' + newRow;
      try {
        await putCSV(newContent, sha, `add food: ${date} ${meal}`);
      } catch (putErr) {
        if (putErr.status !== 409) throw putErr;
        ({ content, sha } = await getCSV());
        newContent = content.endsWith('\n') ? content + newRow : content + '\n' + newRow;
        await putCSV(newContent, sha, `add food: ${date} ${meal}`);
      }

      const allRows = parseCSVRows(newContent);
      const dateRows = allRows.filter(r => r.date === date);
      const dateTotal = sumRows(dateRows);
      const comment = ruleComment(dateTotal, FOOD_TARGET);

      return res.status(200).json({
        success: true,
        entry: { date, meal, text: safeText, kcal, protein, fat, carb },
        today: { ...dateTotal, count: dateRows.length },
        comment,
        source,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
