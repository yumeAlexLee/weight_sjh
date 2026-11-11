export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const key = process.env.DEEPSEEK_API_KEY || '';
  const gh = process.env.GH_TOKEN || '';

  return res.status(200).json({
    success: true,
    node: process.version,
    env: {
      DEEPSEEK_API_KEY: {
        set: key.length > 0,
        length: key.length,
        prefix: key.slice(0, 3),
        suffix: key.length >= 4 ? key.slice(-2) : '',
        hasWhitespace: /\s/.test(key),
        hasQuotes: /^["']|["']$/.test(key),
      },
      GH_TOKEN: {
        set: gh.length > 0,
        length: gh.length,
      },
    },
  });
}
