// Toy predicted scores: model's predicted probability of class 1, plus true label
const scoreData = [
  { score: 0.05, label: 0 }, { score: 0.10, label: 0 }, { score: 0.15, label: 0 },
  { score: 0.20, label: 0 }, { score: 0.28, label: 0 }, { score: 0.33, label: 1 },
  { score: 0.38, label: 0 }, { score: 0.42, label: 0 }, { score: 0.47, label: 1 },
  { score: 0.50, label: 0 }, { score: 0.55, label: 1 }, { score: 0.58, label: 0 },
  { score: 0.62, label: 1 }, { score: 0.65, label: 1 }, { score: 0.70, label: 0 },
  { score: 0.74, label: 1 }, { score: 0.78, label: 1 }, { score: 0.83, label: 1 },
  { score: 0.88, label: 1 }, { score: 0.93, label: 1 }
];

let threshold = 0.5;

// --- True labels strip (top) ---
const trueChart = createChart("#true-viz", { width: 380, height: 110, margin: { top: 10, right: 20, bottom: 30, left: 20 } });
const tx = d3.scaleLinear().domain([0, 1]).range([0, trueChart.innerWidth]);

trueChart.g.append("g")
  .attr("transform", `translate(0,${trueChart.innerHeight})`)
  .call(d3.axisBottom(tx).ticks(5));

const trueDots = trueChart.g.append("g").attr("class", "true-dots");

function renderTrueStrip() {
  const dots = trueDots.selectAll("circle").data(scoreData);
  dots.enter()
    .append("circle")
    .attr("r", 6)
    .attr("cy", trueChart.innerHeight / 2)
    .merge(dots)
    .attr("cx", d => tx(d.score))
    .attr("class", d => d.label === 0 ? "true-dot class-0" : "true-dot class-1");
}

// --- Predicted / threshold strip (bottom) — same width/margins as trueChart, so dots line up vertically ---
const scoresChart = createChart("#scores-viz", { width: 380, height: 130, margin: { top: 10, right: 20, bottom: 30, left: 20 } });
const sx = d3.scaleLinear().domain([0, 1]).range([0, scoresChart.innerWidth]);

scoresChart.g.append("g")
  .attr("transform", `translate(0,${scoresChart.innerHeight})`)
  .call(d3.axisBottom(sx).ticks(5));

const thresholdLine = scoresChart.g.append("line")
  .attr("class", "threshold-line")
  .attr("y1", 0).attr("y2", scoresChart.innerHeight);

const scoreDots = scoresChart.g.append("g").attr("class", "score-dots");

function renderScoresStrip() {
  thresholdLine.attr("x1", sx(threshold)).attr("x2", sx(threshold));

  const dots = scoreDots.selectAll("circle").data(scoreData);
  dots.enter()
    .append("circle")
    .attr("r", 6)
    .attr("cy", scoresChart.innerHeight / 2)
    .merge(dots)
    .attr("cx", d => sx(d.score))
    .attr("class", d => {
      const pred = d.score >= threshold ? 1 : 0;
      return pred === d.label ? "score-dot correct" : "score-dot wrong";
    });

  const predicted1 = scoreData.filter(d => d.score >= threshold).length;
  const predicted0 = scoreData.length - predicted1;
  d3.select("#threshold-split").text(`${predicted0} predicted class 0   ·   ${predicted1} predicted class 1`);
}

// --- ROC chart ---
const rocChart = createChart("#roc-viz", { width: 380, height: 380, margin: { top: 20, right: 20, bottom: 40, left: 45 } });
const rx = d3.scaleLinear().domain([0, 1]).range([0, rocChart.innerWidth]);
const ry = d3.scaleLinear().domain([0, 1]).range([rocChart.innerHeight, 0]);

drawAxes(rocChart.g, rx, ry, rocChart.innerHeight);
addAxisLabels(rocChart.g, rocChart.innerWidth, rocChart.innerHeight, "False Positive Rate", "True Positive Rate");

rocChart.g.append("line")
  .attr("x1", rx(0)).attr("y1", ry(0))
  .attr("x2", rx(1)).attr("y2", ry(1))
  .attr("class", "diagonal");

const rocPath = rocChart.g.append("path").attr("class", "roc-path");
const rocDot = rocChart.g.append("circle").attr("class", "roc-dot").attr("r", 7)
  .call(d3.drag().on("drag", (event) => {
    const fprAtDrag = Math.max(0, Math.min(1, rx.invert(event.x)));
    const roc = computeROC(scoreData);
    let closest = roc[0];
    roc.forEach(p => { if (Math.abs(p.fpr - fprAtDrag) < Math.abs(closest.fpr - fprAtDrag)) closest = p; });
    threshold = Math.max(0, Math.min(1, closest.threshold));
    syncSliderUI();
    render();
  }));

const line = d3.line().x(d => rx(d.fpr)).y(d => ry(d.tpr));

function syncSliderUI() {
  d3.select("#threshold-slider").property("value", threshold);
  d3.select("#threshold-value").text(threshold.toFixed(2));
}

function renderConfusionMatrix(cm) {
  const { tp, fp, tn, fn } = cm;
  d3.select("#confusion-matrix").html(`
    <table class="cm-table">
      <tr><td></td><td class="cm-head">Pred 1</td><td class="cm-head">Pred 0</td></tr>
      <tr><td class="cm-head">True 1</td><td class="cm-cell tp">${tp}<br><small>TP</small></td><td class="cm-cell fn">${fn}<br><small>FN</small></td></tr>
      <tr><td class="cm-head">True 0</td><td class="cm-cell fp">${fp}<br><small>FP</small></td><td class="cm-cell tn">${tn}<br><small>TN</small></td></tr>
    </table>
  `);
}

function renderROC() {
  const roc = computeROC(scoreData);
  const auc = computeAUC(roc);
  rocPath.datum(roc).attr("d", line);
  d3.select("#auc-label").text(`(AUC = ${auc.toFixed(3)})`);

  const cm = confusionMatrix(scoreData, threshold);
  const { fpr, tpr } = metricsFromConfusion(cm);
  rocDot.attr("cx", rx(fpr)).attr("cy", ry(tpr));
}

function render() {
  const cm = confusionMatrix(scoreData, threshold);
  const m = metricsFromConfusion(cm);

  renderTrueStrip();
  renderScoresStrip();
  renderConfusionMatrix(cm);
  renderROC();

  d3.select("#stats").html(
    `Precision = ${m.precision.toFixed(2)} &nbsp;|&nbsp; ` +
    `Recall = ${m.recall.toFixed(2)} &nbsp;|&nbsp; ` +
    `F1 = ${m.f1.toFixed(2)} &nbsp;|&nbsp; ` +
    `Accuracy = ${m.accuracy.toFixed(2)}`
  );
}

d3.select("#threshold-slider").on("input", function () {
  threshold = +this.value;
  d3.select("#threshold-value").text(threshold.toFixed(2));
  render();
});

d3.select("#reset").on("click", () => {
  threshold = 0.5;
  syncSliderUI();
  render();
});

render();