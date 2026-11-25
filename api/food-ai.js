const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const SYSTEM_PROMPT = `你是食物营养解析助手。
输入：中文/日文混排的食物记录，可能带 📅MM/DD: 日块标记、emoji、模糊量词（中份/小份/大份/半个/两个/一口/几口）。
输出 JSON：
{"items":[{"date":"YYYY-MM-DD","meal":"朝|昼|夜|間食|一括","name":"","grams":0,"kcal":0,"protein":0,"fat":0,"carb":0}],"day_comment":""}
规则：
- 数值参考日本食品标准成分表（100g 基准）
- 未知或无法估算的食物：kcal 置 null（严禁瞎猜）
- meal 未指定时填"一括"
- date 未出现时用 defaultDate
- 一句话原则：宁可标未识别，不许乱估数字`;

export async function analyzeFoodText(text, defaultDate) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `defaultDate=${defaultDate}\n${text}` },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed;
  } catch {
    clearTimeout(timer);
    return null;
  }
}
