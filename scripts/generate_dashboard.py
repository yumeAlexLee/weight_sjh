#!/usr/bin/env python3
"""
体重ダッシュボード生成スクリプト (weight_sjh)
data/weight.csv → docs/index.html
"""
import csv
import json
import os
from datetime import datetime

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "weight.csv")
HTML_PATH = os.path.join(os.path.dirname(__file__), "..", "docs", "index.html")
TARGET_WEIGHT = 55


def read_weight_data():
    records = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "date": row["date"].strip(),
                "weight": float(row["weight"]),
                "note": row.get("note", "").strip(),
            })
    return records


def compute_stats(records):
    if not records:
        return {}
    first = records[0]["weight"]
    last = records[-1]["weight"]
    lost = first - last
    total_days = (datetime.strptime(records[-1]["date"], "%Y-%m-%d") -
                  datetime.strptime(records[0]["date"], "%Y-%m-%d")).days + 1
    return {
        "start_weight": first,
        "current_weight": last,
        "lost": round(lost, 1),
        "target_weight": TARGET_WEIGHT,
        "total_days": total_days,
        "records_count": len(records),
    }


def generate_html(records, stats):
    dates = [r["date"] for r in records]
    weights = [r["weight"] for r in records]
    target_line = [TARGET_WEIGHT] * len(records)

    start_weight = stats["start_weight"] if stats else TARGET_WEIGHT

    chart_data = json.dumps({"labels": dates, "weights": weights, "target": TARGET_WEIGHT})

    rows_html = ""
    if records:
        rows_html = "".join(
            f"<tr><td>{r['date']}</td><td>{r['weight']}</td><td class='note'>{r['note']}</td></tr>"
            for r in reversed(records)
        )

    stats_cards = ""
    if stats:
        loss_class = "loss" if stats["lost"] > 0 else "gain" if stats["lost"] < 0 else "neutral"
        remaining = round(stats["current_weight"] - TARGET_WEIGHT, 1)
        stats_cards = f"""
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">当前体重</div>
        <div class="value">{stats['current_weight']}kg</div>
      </div>
      <div class="stat-card">
        <div class="label">已减</div>
        <div class="value {loss_class}">{'+' if stats['lost'] > 0 else ''}{stats['lost']}kg</div>
      </div>
      <div class="stat-card">
        <div class="label">剩余</div>
        <div class="value">{remaining}kg</div>
      </div>
      <div class="stat-card">
        <div class="label">已记录</div>
        <div class="value">{stats['total_days']}天</div>
      </div>
    </div>"""

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>体重记录 - sjh</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }}
    .container {{ max-width: 900px; width: 100%; }}
    h1 {{ font-size: 24px; font-weight: 600; margin: 20px 0 4px; color: #f1f5f9; }}
    .subtitle {{ color: #64748b; font-size: 14px; margin-bottom: 20px; }}
    .stats-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }}
    .stat-card {{
      background: #1e293b;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      border: 1px solid #334155;
    }}
    .stat-card .label {{ font-size: 12px; color: #64748b; margin-bottom: 4px; }}
    .stat-card .value {{ font-size: 26px; font-weight: 700; }}
    .stat-card .value.loss {{ color: #22c55e; }}
    .stat-card .value.gain {{ color: #ef4444; }}
    .chart-wrapper, .table-wrapper, .form-wrapper {{
      background: #1e293b;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #334155;
      margin-bottom: 20px;
    }}
    .section-title {{ font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #cbd5e1; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
    th {{ text-align: left; padding: 8px 12px; color: #64748b; font-weight: 500; border-bottom: 1px solid #334155; }}
    td {{ padding: 8px 12px; border-bottom: 1px solid #1e293b; }}
    tr:hover td {{ background: #1a2332; }}
    .note {{ color: #94a3b8; font-size: 12px; }}

    /* Form */
    .form-row {{
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: flex-end;
    }}
    .form-group {{ display: flex; flex-direction: column; gap: 4px; }}
    .form-group label {{ font-size: 12px; color: #64748b; }}
    .form-group input {{
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 14px;
      color: #e2e8f0;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }}
    .form-group input:focus {{ border-color: #3b82f6; }}
    .form-group input::placeholder {{ color: #475569; }}
    .btn {{
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }}
    .btn:hover {{ background: #2563eb; }}
    .btn:disabled {{ opacity: 0.5; cursor: not-allowed; }}
    .toast {{
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 100;
      display: none;
    }}
    .toast.success {{ background: #166534; color: #bbf7d0; display: block; }}
    .toast.error {{ background: #7f1d1d; color: #fecaca; display: block; }}
    @media (max-width: 600px) {{
      .stats-grid {{ grid-template-columns: repeat(2, 1fr); }}
      h1 {{ font-size: 20px; }}
      .form-row {{ flex-direction: column; }}
      .form-group input {{ width: 100%; }}
      .btn {{ width: 100%; }}
    }}
  </style>
</head>
<body>
  <div class="container">
    <h1>📉 体重记录</h1>
    <p class="subtitle">记录你的每日体重变化</p>

    {stats_cards}

    <div class="form-wrapper">
      <div class="section-title">✏️ 记录体重</div>
      <div class="form-row">
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="input-date">
        </div>
        <div class="form-group">
          <label>体重 (kg)</label>
          <input type="number" id="input-weight" step="0.1" min="30" max="120" placeholder="55.0">
        </div>
        <div class="form-group">
          <label>备注 (可选)</label>
          <input type="text" id="input-note" placeholder="例: 朝食前">
        </div>
        <button class="btn" id="btn-submit" onclick="addWeight()">提交</button>
      </div>
      <div id="toast" class="toast"></div>
    </div>

    <div class="chart-wrapper">
      <div class="section-title">📊 体重变化曲线</div>
      <canvas id="weightChart"></canvas>
    </div>

    <div class="table-wrapper">
      <div class="section-title">📋 记录明细</div>
      <table>
        <thead>
          <tr><th>日期</th><th>体重 (kg)</th><th>备注</th></tr>
        </thead>
        <tbody>{rows_html}</tbody>
      </table>
    </div>

    <div class="footer" style="text-align:center;color:#475569;font-size:12px;margin:20px 0;">
      在网站上记录体重即可
    </div>
  </div>

  <script>
    const chartData = {chart_data};

    function initChart() {{
      const ctx = document.getElementById('weightChart').getContext('2d');
      const targetLine = new Array(chartData.labels.length).fill(chartData.target);
      new Chart(ctx, {{
        type: 'line',
        data: {{
          labels: chartData.labels,
          datasets: [
            {{
              label: '体重 (kg)',
              data: chartData.weights,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#1e293b',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8,
              tension: 0.3,
              fill: true,
            }},
            {{
              label: `目标 ${{chartData.target}}kg`,
              data: targetLine,
              borderColor: '#22c55e',
              borderWidth: 2,
              borderDash: [8, 4],
              pointRadius: 0,
              pointHoverRadius: 0,
            }}
          ]
        }},
        options: {{
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.8,
          interaction: {{ intersect: false, mode: 'index' }},
          plugins: {{
            legend: {{
              labels: {{ color: '#94a3b8', font: {{ size: 13 }}, usePointStyle: true, padding: 16 }}
            }},
            tooltip: {{
              backgroundColor: '#1e293b',
              titleColor: '#e2e8f0',
              bodyColor: '#cbd5e1',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              callbacks: {{
                label: function(context) {{
                  if (context.dataset.label.includes('目标')) return context.dataset.label;
                  return context.parsed.y + 'kg';
                }}
              }}
            }}
          }},
          scales: {{
            x: {{ grid: {{ color: 'rgba(51, 65, 85, 0.5)' }}, ticks: {{ color: '#64748b', maxTicksLimit: 15 }} }},
            y: {{ min: 40, max: 80, grid: {{ color: 'rgba(51, 65, 85, 0.5)' }}, ticks: {{ color: '#64748b', stepSize: 2, callback: function(v) {{ return v + 'kg'; }} }} }}
          }}
        }}
      }});
    }}

    document.addEventListener('DOMContentLoaded', function() {{
      var today = new Date().toISOString().split('T')[0];
      if (document.getElementById('input-date')) {{
        document.getElementById('input-date').value = today;
        document.getElementById('input-date').max = today;
      }}
      if (chartData.labels.length > 0) initChart();
    }});

    function showToast(msg, type) {{
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast ' + type;
      setTimeout(function() {{ t.className = 'toast'; }}, 3000);
    }}

    function addWeight() {{
      var date = document.getElementById('input-date').value;
      var weight = document.getElementById('input-weight').value;
      var note = document.getElementById('input-note').value.trim();
      if (!date) {{ showToast('请选择日期', 'error'); return; }}
      if (!weight) {{ showToast('请输入体重', 'error'); return; }}
      var btn = document.getElementById('btn-submit');
      btn.disabled = true;
      btn.textContent = '提交中...';
      fetch('/api/add-weight', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ date: date, weight: parseFloat(weight), note: note }})
      }})
      .then(function(r) {{ return r.json(); }})
      .then(function(data) {{
        if (data.success) {{
          showToast('✅ 记录成功！请刷新页面查看', 'success');
          document.getElementById('input-weight').value = '';
          document.getElementById('input-note').value = '';
        }} else {{
          showToast('❌ ' + (data.error || '提交失败'), 'error');
        }}
      }})
      .catch(function(err) {{
        showToast('❌ 网络错误: ' + err.message, 'error');
      }})
      .finally(function() {{
        btn.disabled = false;
        btn.textContent = '提交';
      }});
    }}
  </script>
</body>
</html>"""


def main():
    records = read_weight_data()
    stats = compute_stats(records)
    os.makedirs(os.path.dirname(HTML_PATH), exist_ok=True)
    html = generate_html(records, stats)
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"✅ Dashboard generated: {HTML_PATH}")
    if stats:
        print(f"   Records: {stats['records_count']} entries")
        print(f"   Current: {stats['current_weight']}kg")


if __name__ == "__main__":
    main()
