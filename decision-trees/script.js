// Training data: [x1, x2, label]  includes some overlap points so shallow
// trees make visible mistakes and deeper trees start to overfit them.
const trainingData = [
  [2, 2, 0], [2.5, 3, 0], [3, 1.5, 0], [1.5, 2.5, 0], [3.5, 2, 0],
  [2, 4, 0], [1, 1.5, 0], [3, 3.5, 0], [4, 4, 0],
  [7, 7, 1], [7.5, 6, 1], [8, 8, 1], [6.5, 7.5, 1], [8.5, 7, 1],
  [7, 5.5, 1], [9, 8.5, 1], [6, 6.5, 1], [7, 8.5, 1],
  [5, 5, 1], [4.5, 6, 0], [6, 4, 1]
];

let maxDepth = 2;
let showRegions = true;
let queryPoint = null;
let root = null;

const { g, innerWidth, innerHeight } = createChart("#viz");
const xScale = d3.scaleLinear().domain([0, 10]).range([0, innerWidth]);
const yScale = d3.scaleLinear().domain([0, 10]).range([innerHeight, 0]);

addAxisLabels(g, innerWidth, innerHeight, "Feature x₁", "Feature x₂");

// Click catcher FIRST so nothing blocks it
const clickCatcher = g.append("rect")
  .attr("width", innerWidth)
  .attr("height", innerHeight)
  .attr("fill", "transparent")
  .style("pointer-events", "all")
  .on("click", (event) => {
    const [mx, my] = d3.pointer(event);
    queryPoint = [xScale.invert(mx), yScale.invert(my)];
    render();
  });

const regionLayer = g.append("g").attr("class", "regions");
addGrid(g, xScale, yScale, innerWidth, innerHeight);
drawAxes(g, xScale, yScale, innerHeight);
const trainingLayer = g.append("g").attr("class", "training-points");
const queryLayer = g.append("g").attr("class", "query-point");

const REGION_CELL = 14;

function renderRegions() {
  if (!showRegions) {
    regionLayer.selectAll("rect").remove();
    return;
  }
  const cols = Math.ceil(innerWidth / REGION_CELL);
  const rows = Math.ceil(innerHeight / REGION_CELL);
  const cells = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = i * REGION_CELL + REGION_CELL / 2;
      const py = j * REGION_CELL + REGION_CELL / 2;
      const label = predictTree(root, [xScale.invert(px), yScale.invert(py)]);
      cells.push({ px, py, label });
    }
  }
  const rects = regionLayer.selectAll("rect").data(cells);
  rects.enter()
    .append("rect")
    .attr("width", REGION_CELL)
    .attr("height", REGION_CELL)
    .merge(rects)
    .attr("x", d => d.px - REGION_CELL / 2)
    .attr("y", d => d.py - REGION_CELL / 2)
    .attr("fill", d => d.label === 0 ? "var(--color-point)" : "var(--color-wrong)")
    .attr("opacity", 0.13);
  rects.exit().remove();
}

function renderPoints() {
  const points = trainingLayer.selectAll("circle").data(trainingData);
  points.enter()
    .append("circle")
    .attr("r", 6)
    .merge(points)
    .attr("cx", d => xScale(d[0]))
    .attr("cy", d => yScale(d[1]))
    .attr("class", d => d[2] === 0 ? "class-0" : "class-1");
}

// --- Tree diagram ---
let currentPath = null;

function renderTreeDiagram() {
  const svg = d3.select("#tree-viz");
  svg.selectAll("*").remove();

  const width = 420, height = 460;
  const margin = { top: 30, right: 20, bottom: 20, left: 20 };

  const hierarchyRoot = d3.hierarchy(attachChildren(root));
  const layout = d3.tree().size([width - margin.left - margin.right, height - margin.top - margin.bottom]);
  layout(hierarchyRoot);

  const tg = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  tg.selectAll(".tree-link")
    .data(hierarchyRoot.links())
    .enter()
    .append("path")
    .attr("class", d => "tree-link" + (currentPath && currentPath.includes(d.source.data) && currentPath.includes(d.target.data) ? " active" : ""))
    .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));

  const nodeG = tg.selectAll(".tree-node")
    .data(hierarchyRoot.descendants())
    .enter()
    .append("g")
    .attr("class", d => "tree-node" + (d.data.isLeaf ? " leaf" : "") + (currentPath && currentPath.includes(d.data) ? " active" : ""))
    .attr("transform", d => `translate(${d.x},${d.y})`);

  nodeG.append("rect")
    .attr("x", -42).attr("y", -16).attr("width", 84).attr("height", 32).attr("rx", 6);

  nodeG.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", -2)
    .text(d => d.data.isLeaf ? `class ${d.data.label}` : `x${d.data.feature + 1} ≤ ${d.data.threshold.toFixed(1)}`);

  nodeG.append("text")
    .attr("class", "node-sub")
    .attr("text-anchor", "middle")
    .attr("dy", 12)
    .text(d => `n=${d.data.count}`);
}

function render() {
  root = buildTree(trainingData, 0, maxDepth);

  renderRegions();
  renderPoints();

  queryLayer.selectAll("*").remove();
  currentPath = null;

  if (queryPoint) {
    currentPath = predictPath(root, queryPoint);
    const predictedLabel = currentPath[currentPath.length - 1].label;

    queryLayer.append("circle")
      .attr("r", 9)
      .attr("cx", xScale(queryPoint[0]))
      .attr("cy", yScale(queryPoint[1]))
      .attr("class", `query class-${predictedLabel}`);

    d3.select("#stats").html(
      `max depth = ${maxDepth} &nbsp;|&nbsp; path length = ${currentPath.length - 1} splits ` +
      `&nbsp;|&nbsp; predicted: <strong>class ${predictedLabel}</strong>`
    );
  } else {
    d3.select("#stats").html(`max depth = ${maxDepth} &nbsp;|&nbsp; click the chart to trace a point through the tree.`);
  }

  renderTreeDiagram();
}

d3.select("#depth-slider").on("input", function () {
  maxDepth = +this.value;
  d3.select("#depth-value").text(maxDepth);
  render();
});

d3.select("#reset").on("click", () => {
  queryPoint = null;
  render();
});

d3.select("#toggle-regions").on("change", function () {
  showRegions = this.checked;
  render();
});

render();