// Training data: [x1, x2, label]
const trainingData = [
  [2, 2, 0], [2.5, 3, 0], [3, 1.5, 0], [1.5, 2.5, 0], [3.5, 2, 0],
  [2, 4, 0], [1, 1.5, 0], [3, 3.5, 0], [4, 4, 0],
  [7, 7, 1], [7.5, 6, 1], [8, 8, 1], [6.5, 7.5, 1], [8.5, 7, 1],
  [7, 5.5, 1], [9, 8.5, 1], [6, 6.5, 1], [7, 8.5, 1]
];

let k = 3;
let showRegions = true;
let queryPoint = null; // [x1, x2]

const { g, innerWidth, innerHeight } = createChart("#viz");

const xScale = d3.scaleLinear().domain([0, 10]).range([0, innerWidth]);
const yScale = d3.scaleLinear().domain([0, 10]).range([innerHeight, 0]);

addAxisLabels(g, innerWidth, innerHeight, "Feature x₁", "Feature x₂");

// --- Layers, back to front ---
const regionLayer = g.append("g").attr("class", "regions");
addGrid(g, xScale, yScale, innerWidth, innerHeight);
drawAxes(g, xScale, yScale, innerHeight);
const neighborLinesLayer = g.append("g").attr("class", "neighbor-lines");
const trainingLayer = g.append("g").attr("class", "training-points");
const queryLayer = g.append("g").attr("class", "query-point");

const clickCatcher = g.insert("rect", ".regions + *")
  .lower()
  .attr("width", innerWidth)
  .attr("height", innerHeight)
  .attr("fill", "transparent")
  .style("pointer-events", "all")
  .on("click", (event) => {
    const [mx, my] = d3.pointer(event);
    queryPoint = [xScale.invert(mx), yScale.invert(my)];
    render();
  });
// keep click catcher below everything else but still clickable
clickCatcher.lower();

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
      const query = [xScale.invert(px), yScale.invert(py)];
      const { predictedLabel } = knnClassify(trainingData, query, k);
      cells.push({ px, py, predictedLabel });
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
    .attr("fill", d => d.predictedLabel === 0 ? "var(--color-point)" : "var(--color-wrong)")
    .attr("opacity", 0.13);
  rects.exit().remove();
}

function render() {
  renderRegions();

  // Training points
  const points = trainingLayer.selectAll("circle").data(trainingData);
  points.enter()
    .append("circle")
    .attr("r", 6)
    .merge(points)
    .attr("cx", d => xScale(d[0]))
    .attr("cy", d => yScale(d[1]))
    .attr("class", d => d[2] === 0 ? "class-0" : "class-1");

  // Query point + neighbor lines + result
  neighborLinesLayer.selectAll("*").remove();
  queryLayer.selectAll("*").remove();

  if (queryPoint) {
    const { predictedLabel, neighbors } = knnClassify(trainingData, queryPoint, k);

    // lines to the k nearest neighbors
    neighborLinesLayer.selectAll("line")
      .data(neighbors)
      .enter()
      .append("line")
      .attr("x1", xScale(queryPoint[0]))
      .attr("y1", yScale(queryPoint[1]))
      .attr("x2", d => xScale(d.point[0]))
      .attr("y2", d => yScale(d.point[1]))
      .attr("class", "neighbor-line");

    // highlight the neighbor points themselves
    neighborLinesLayer.selectAll("circle.highlight")
      .data(neighbors)
      .enter()
      .append("circle")
      .attr("class", "highlight")
      .attr("r", 9)
      .attr("cx", d => xScale(d.point[0]))
      .attr("cy", d => yScale(d.point[1]));

    // the query point itself
    queryLayer.append("circle")
      .attr("r", 9)
      .attr("cx", xScale(queryPoint[0]))
      .attr("cy", yScale(queryPoint[1]))
      .attr("class", `query class-${predictedLabel}`);

    const votes0 = neighbors.filter(n => n.point[2] === 0).length;
    const votes1 = neighbors.filter(n => n.point[2] === 1).length;

    d3.select("#stats").html(
      `k = ${k} &nbsp;|&nbsp; votes: class 0 = ${votes0}, class 1 = ${votes1} ` +
      `&nbsp;|&nbsp; predicted: <strong>class ${predictedLabel}</strong>`
    );
  } else {
    d3.select("#stats").html(`Click anywhere on the chart to classify a new point.`);
  }
}

d3.select("#k-slider").on("input", function () {
  k = +this.value;
  d3.select("#k-value").text(k);
  render();
});

d3.select("#reset").on("click", () => {
  queryPoint = null;
  k = 3;
  d3.select("#k-slider").property("value", 3);
  d3.select("#k-value").text(3);
  render();
});

d3.select("#toggle-regions").on("change", function () {
  showRegions = this.checked;
  render();
});

render();