// Toy dataset: [x1, x2, label]
const initialData = [
  [2, 2, 0], [2.5, 3, 0], [3, 1.5, 0], [1.5, 2.5, 0], [3.5, 2, 0],
  [2, 4, 0], [1, 1.5, 0], [3, 3.5, 0],
  [7, 7, 1], [7.5, 6, 1], [8, 8, 1], [6.5, 7.5, 1], [8.5, 7, 1],
  [7, 5.5, 1], [9, 8.5, 1], [6, 6.5, 1]
];

let data = initialData.map(d => [...d]);
let addClass = 0;
let showHeatmap = true;
let prevLoss = null;

const { g, innerWidth, innerHeight } = createChart("#viz");

const xScale = d3.scaleLinear().domain([0, 10]).range([0, innerWidth]);
const yScale = d3.scaleLinear().domain([0, 10]).range([innerHeight, 0]);

addAxisLabels(g, innerWidth, innerHeight, "Feature x₁", "Feature x₂");

// --- Layers, back to front ---
const heatmapLayer = g.append("g").attr("class", "heatmap");
addGrid(g, xScale, yScale, innerWidth, innerHeight);
drawAxes(g, xScale, yScale, innerHeight);
const boundaryLine = g.append("line").attr("class", "boundary-line");
const pointLayer = g.append("g").attr("class", "points");

// Invisible rect to catch clicks on empty background (must be added before points, after heatmap)
const clickCatcher = g.insert("rect", ".points")
  .attr("width", innerWidth)
  .attr("height", innerHeight)
  .attr("fill", "transparent")
  .on("click", (event) => {
    const [mx, my] = d3.pointer(event);
    data.push([xScale.invert(mx), yScale.invert(my), addClass]);
    render();
  });

const HEAT_CELL = 22;

function renderHeatmap(w1, w2, b) {
  if (!showHeatmap) {
    heatmapLayer.selectAll("rect").remove();
    return;
  }
  const cols = Math.ceil(innerWidth / HEAT_CELL);
  const rows = Math.ceil(innerHeight / HEAT_CELL);
  const cells = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = i * HEAT_CELL + HEAT_CELL / 2;
      const py = j * HEAT_CELL + HEAT_CELL / 2;
      const x1 = xScale.invert(px);
      const x2 = yScale.invert(py);
      const prob = sigmoid(w1 * x1 + w2 * x2 + b);
      cells.push({ px, py, prob });
    }
  }

  const rects = heatmapLayer.selectAll("rect").data(cells);
  rects.enter()
    .append("rect")
    .attr("width", HEAT_CELL)
    .attr("height", HEAT_CELL)
    .merge(rects)
    .attr("x", d => d.px - HEAT_CELL / 2)
    .attr("y", d => d.py - HEAT_CELL / 2)
    .attr("fill", d => d.prob > 0.5 ? "var(--color-wrong)" : "var(--color-point)")
    .attr("opacity", d => Math.abs(d.prob - 0.5) * 0.5);
  rects.exit().remove();
}

function render() {
  if (data.length < 2) return; // need at least a couple points to fit anything meaningful

  const { w1, w2, b } = trainLogisticRegression(data);

  renderHeatmap(w1, w2, b);

  // Decision boundary: w1*x1 + w2*x2 + b = 0  =>  x2 = -(w1*x1 + b) / w2
  if (Math.abs(w2) > 1e-6) {
    const x1a = 0, x1b = 10;
    const x2a = -(w1 * x1a + b) / w2;
    const x2b = -(w1 * x1b + b) / w2;
    boundaryLine
      .attr("x1", xScale(x1a)).attr("y1", yScale(x2a))
      .attr("x2", xScale(x1b)).attr("y2", yScale(x2b))
      .attr("opacity", 1);
  } else {
    boundaryLine.attr("opacity", 0);
  }

  // Points
  const points = pointLayer.selectAll("circle").data(data);
  points.enter()
    .append("circle")
    .attr("r", 7)
    .call(d3.drag().on("drag", dragged))
    .on("dblclick", (event, d) => {
      d[2] = d[2] === 0 ? 1 : 0;
      render();
    })
    .merge(points)
    .attr("cx", d => xScale(d[0]))
    .attr("cy", d => yScale(d[1]))
    .attr("class", d => d[2] === 0 ? "class-0" : "class-1");
  points.exit().remove();

  // Stats
  const loss = crossEntropyLoss(data, w1, w2, b);
  const preds = data.map(([x1, x2]) => sigmoid(w1 * x1 + w2 * x2 + b) >= 0.5 ? 1 : 0);
  const correct = preds.filter((p, i) => p === data[i][2]).length;
  const accuracy = correct / data.length;

  d3.select("#stats").html(
    `boundary: ${w1.toFixed(2)}x₁ + ${w2.toFixed(2)}x₂ + ${b.toFixed(2)} = 0 &nbsp;|&nbsp; ` +
    `Loss = <span id="loss-value">${(prevLoss ?? loss).toFixed(3)}</span> &nbsp;|&nbsp; ` +
    `Accuracy = ${(accuracy * 100).toFixed(0)}%`
  );
  if (prevLoss !== null) {
    animateNumber(document.getElementById("loss-value"), prevLoss, loss, 3);
  }
  prevLoss = loss;
}

function dragged(event, d) {
  d[0] = xScale.invert(event.x);
  d[1] = yScale.invert(event.y);
  render();
}

d3.selectAll('input[name="cls"]').on("change", function () {
  addClass = +this.value;
});

d3.select("#reset").on("click", () => {
  data = initialData.map(d => [...d]);
  render();
});

d3.select("#toggle-heatmap").on("change", function () {
  showHeatmap = this.checked;
  render();
});

render();