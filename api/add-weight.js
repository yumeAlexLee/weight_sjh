// Vercel Serverless Function: /api/add-weight
// 接收 POST 请求，追加体重数据到 GitHub 的 data/weight.csv

const GITHUB_TOKEN = process.env.GH_TOKEN || '';
const OWNER = 'yumeAlexLee';
const REPO = 'weight_sjh';
const BRANCH = 'main';
const CSV_PATH = 'data/weight.csv';
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CSV_PATH}`;

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { date, weight, note } = req.body;
  if (!date || !weight) {
    return res.status(400).json({ success: false, error: '请填写日期和体重' });
  }

  try {
    // 1. 获取当前文件内容和 SHA
    const getRes = await fetch(`${API}?ref=${BRANCH}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!getRes.ok) {
      const errText = await getRes.text();
      return res.status(500).json({ success: false, error: `获取文件失败: ${errText}` });
    }

    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const sha = fileData.sha;

    // 2. 追加新行
    const noteStr = note ? `,${note}` : ',';
    const newLine = `${date},${weight}${noteStr}\n`;
    const newContent = currentContent + newLine;

    // 3. 推送到 GitHub
    const putRes = await fetch(API, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `add weight: ${date} ${weight}kg`,
        content: Buffer.from(newContent).toString('base64'),
        sha,
        branch: BRANCH,
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return res.status(500).json({ success: false, error: `提交失败: ${errText}` });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
