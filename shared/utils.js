// Shared helpers used across demos.

// --- Math helpers ---

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  const m = mean(arr);
  const variance = mean(arr.map(x => (x - m) ** 2));
  return Math.sqrt(variance);
}

function euclideanDistance(a, b) {
  // a, b are [x, y] pairs
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

// --- D3 setup helper ---


function createChart(svgSelector, { width = 700, height = 450, margin = { top: 20, right: 20, bottom: 40, left: 50 } } = {}) {
  const svg = d3.select(svgSelector)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  return { svg, g, width, height, innerWidth, innerHeight, margin };
}

function drawAxes(g, xScale, yScale, innerHeight) {
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale));

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));
}


function animateNumber(node, from, to, decimals = 3) {
  d3.select(node).transition().duration(300).tween("text", function () {
    const i = d3.interpolateNumber(from, to);
    return t => { this.textContent = i(t).toFixed(decimals); };
  });
}

function addGrid(g, xScale, yScale, innerWidth, innerHeight) {
  const gridLayer = g.append("g").attr("class", "grid");
  gridLayer.append("g")
    .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(""));
  gridLayer.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(""));
  gridLayer.selectAll("line").attr("stroke", "var(--color-grid)");
  return gridLayer;
}

function addAxisLabels(g, innerWidth, innerHeight, xLabel, yLabel) {
  g.append("text")
    .attr("x", innerWidth / 2).attr("y", innerHeight + 35)
    .attr("text-anchor", "middle").attr("class", "axis-label")
    .text(xLabel);
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2).attr("y", -35)
    .attr("text-anchor", "middle").attr("class", "axis-label")
    .text(yLabel);
}


// --- Logistic regression helpers ---

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

// points: [[x1, x2, label], ...], label is 0 or 1
function trainLogisticRegression(points, { iterations = 300, lr = 0.1 } = {}) {
  let w1 = 0, w2 = 0, b = 0;
  const n = points.length;
  for (let iter = 0; iter < iterations; iter++) {
    let gw1 = 0, gw2 = 0, gb = 0;
    for (const [x1, x2, y] of points) {
      const pred = sigmoid(w1 * x1 + w2 * x2 + b);
      const error = pred - y;
      gw1 += error * x1;
      gw2 += error * x2;
      gb += error;
    }
    w1 -= lr * gw1 / n;
    w2 -= lr * gw2 / n;
    b -= lr * gb / n;
  }
  return { w1, w2, b };
}

function crossEntropyLoss(points, w1, w2, b) {
  const eps = 1e-9;
  const losses = points.map(([x1, x2, y]) => {
    const p = sigmoid(w1 * x1 + w2 * x2 + b);
    return -(y * Math.log(p + eps) + (1 - y) * Math.log(1 - p + eps));
  });
  return mean(losses);
}