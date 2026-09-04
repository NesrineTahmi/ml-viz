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

// --- KNN helper ---

// trainingPoints: [[x1, x2, label], ...]
// query: [x1, x2]
// returns { predictedLabel, neighbors: [{point, distance}, ...] } sorted by distance, top k
function knnClassify(trainingPoints, query, k) {
  const withDist = trainingPoints.map(p => ({
    point: p,
    distance: euclideanDistance([p[0], p[1]], query)
  }));
  withDist.sort((a, b) => a.distance - b.distance);
  const neighbors = withDist.slice(0, k);
  const votes = {};
  neighbors.forEach(n => {
    const label = n.point[2];
    votes[label] = (votes[label] || 0) + 1;
  });
  const predictedLabel = +Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
  return { predictedLabel, neighbors };
}

// --- Decision tree helpers ---

function giniImpurity(labels) {
  const total = labels.length;
  if (total === 0) return 0;
  const counts = {};
  labels.forEach(l => counts[l] = (counts[l] || 0) + 1);
  return 1 - Object.values(counts).reduce((s, c) => s + (c / total) ** 2, 0);
}

function majorityClass(points) {
  const counts = {};
  points.forEach(p => counts[p[2]] = (counts[p[2]] || 0) + 1);
  return +Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function bestSplit(points) {
  const n = points.length;
  const baseGini = giniImpurity(points.map(p => p[2]));
  let best = null;

  for (let feature = 0; feature < 2; feature++) {
    const values = [...new Set(points.map(p => p[feature]))].sort((a, b) => a - b);
    for (let i = 0; i < values.length - 1; i++) {
      const threshold = (values[i] + values[i + 1]) / 2;
      const left = points.filter(p => p[feature] <= threshold);
      const right = points.filter(p => p[feature] > threshold);
      if (left.length === 0 || right.length === 0) continue;

      const weighted = (left.length / n) * giniImpurity(left.map(p => p[2])) +
                        (right.length / n) * giniImpurity(right.map(p => p[2]));
      const gain = baseGini - weighted;

      if (!best || gain > best.gain) {
        best = { feature, threshold, gain, left, right };
      }
    }
  }
  return best;
}

function buildTree(points, depth, maxDepth, minSamplesSplit = 2) {
  const gini = giniImpurity(points.map(p => p[2]));
  const label = majorityClass(points);

  if (depth >= maxDepth || gini === 0 || points.length < minSamplesSplit) {
    return { isLeaf: true, label, gini, count: points.length };
  }

  const split = bestSplit(points);
  if (!split || split.gain <= 0) {
    return { isLeaf: true, label, gini, count: points.length };
  }

  return {
    isLeaf: false,
    feature: split.feature,
    threshold: split.threshold,
    gini,
    count: points.length,
    left: buildTree(split.left, depth + 1, maxDepth, minSamplesSplit),
    right: buildTree(split.right, depth + 1, maxDepth, minSamplesSplit)
  };
}

function predictTree(node, point) {
  if (node.isLeaf) return node.label;
  const val = point[node.feature];
  return val <= node.threshold ? predictTree(node.left, point) : predictTree(node.right, point);
}

// Returns the list of nodes visited from root to the leaf for a given point
function predictPath(node, point) {
  const path = [node];
  let current = node;
  while (!current.isLeaf) {
    current = point[current.feature] <= current.threshold ? current.left : current.right;
    path.push(current);
  }
  return path;
}

// Adds a children array in place so d3.hierarchy can walk it directly
// (kept as the SAME objects, not copies, so path-highlighting works by reference)
function attachChildren(node) {
  if (!node.isLeaf) {
    node.children = [attachChildren(node.left), attachChildren(node.right)];
  }
  return node;
}

// --- Evaluation metrics helpers ---

// scores: array of {score, label} where label is 0 or 1, score is predicted probability of class 1
function confusionMatrix(scores, threshold) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  scores.forEach(({ score, label }) => {
    const pred = score >= threshold ? 1 : 0;
    if (pred === 1 && label === 1) tp++;
    else if (pred === 1 && label === 0) fp++;
    else if (pred === 0 && label === 0) tn++;
    else fn++;
  });
  return { tp, fp, tn, fn };
}

function metricsFromConfusion({ tp, fp, tn, fn }) {
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
  const accuracy = (tp + tn) / (tp + fp + tn + fn);
  const fpr = fp + tn === 0 ? 0 : fp / (fp + tn); // false positive rate
  const tpr = recall; // true positive rate = recall
  return { precision, recall, f1, accuracy, fpr, tpr };
}

// Sweeps all thresholds present in the data to build the ROC curve
function computeROC(scores) {
  const thresholds = [...new Set(scores.map(s => s.score))].sort((a, b) => b - a);
  thresholds.push(1.01, -0.01); // ensure curve starts at (0,0) and ends at (1,1)
  const points = thresholds.map(t => {
    const cm = confusionMatrix(scores, t);
    const { fpr, tpr } = metricsFromConfusion(cm);
    return { threshold: t, fpr, tpr };
  });
  points.sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
  return points;
}

// Trapezoidal AUC from sorted ROC points
function computeAUC(rocPoints) {
  let auc = 0;
  for (let i = 1; i < rocPoints.length; i++) {
    const dx = rocPoints[i].fpr - rocPoints[i - 1].fpr;
    const avgY = (rocPoints[i].tpr + rocPoints[i - 1].tpr) / 2;
    auc += dx * avgY;
  }
  return auc;
}