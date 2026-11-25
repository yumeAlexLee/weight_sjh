# weight_sjh
体重记录看板 - sjh

## データファイル

| ファイル | 説明 |
|---|---|
| `data/weight.csv` | 体重記録（date, weight, note） |
| `data/food.csv` | 食事記録（date, meal, text, kcal, protein, fat, carb, source） |
| `data/analysis.csv` | AI栄養分析キャッシュ（date, verdict, advice, model, updated_at） |

## 必須環境変数（Vercel）

| 変数 | 説明 |
|---|---|
| `GH_TOKEN` | GitHub Personal Access Token（CSVへの書き込み用） |
| `DEEPSEEK_API_KEY` | DeepSeek API key（食事AI解析・分析用、任意） |

