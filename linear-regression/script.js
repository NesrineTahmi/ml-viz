const initialData = [
  [0.5, 1.3], [1, 2.1], [1.5, 2.4], [2, 3.1], [2.5, 3.6],
  [3, 3.9], [3.5, 4.7], [4, 5.2], [4.5, 5.5], [5, 5.8],
  [5.5, 6.6], [6, 7.1], [6.5, 7.0], [7, 7.5], [7.5, 8.4],
  [8, 9.2], [8.5, 8.9], [9, 9.8], [9.5, 10.3], [10, 10.6]
];

let data = initialData.map(d => [...d]);
let showResiduals = true;
let prevError = null;

const { g, innerWidth, innerHeight } = createChart("#viz");

const xScale = d3.scaleLinear().domain([0, 10.5]).range([0, innerWidth]);
const yScale = d3.scaleLinear().domain([0, 11.5]).range([innerHeight, 0]);

// --- Layers, back to front: grid -> axes -> residuals -> fit line -> points ---

addGrid(g, xScale, yScale, innerWidth, innerHeight);
drawAxes(g, xScale, yScale, innerHeight);
addAxisLabels(g, innerWidth, innerHeight, "X", "y");

const residualLayer = g.append("g").attr("class", "residuals");
const lineEl = g.append("line").attr("class", "fit-line");
const pointLayer = g.append("g").attr("class", "points");

const errorColor = d3.scaleLinear().domain([0, 3]).range(["#4caf50", "#e0575b"]).clamp(true);

function leastSquares(points) {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const mx = mean(xs), my = mean(ys);
  const num = points.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const den = points.reduce((s, [x]) => s + (x - mx) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return { slope, intercept };
}

function mse(points, slope, intercept) {
  const errors = points.map(([x, y]) => (y - (slope * x + intercept)) ** 2);
  return mean(errors);
}

function render(animateLine = true) {
  const { slope, intercept } = leastSquares(data);
  const y0 = slope * 0 + intercept;
  const y105 = slope * 10.5 + intercept;

  const lineSel = animateLine ? lineEl.transition().duration(300) : lineEl;
  lineSel
    .attr("x1", xScale(0))
    .attr("y1", yScale(y0))
    .attr("x2", xScale(10.5))
    .attr("y2", yScale(y105));

  // Residuals
  const resLines = residualLayer.selectAll("line").data(showResiduals ? data : []);
  resLines.enter()
    .append("line")
    .attr("class", "residual")
    .merge(resLines)
    .attr("x1", d => xScale(d[0]))
    .attr("x2", d => xScale(d[0]))
    .attr("y1", d => yScale(d[1]))
    .attr("y2", d => yScale(slope * d[0] + intercept));
  resLines.exit().remove();

  // Points
  const points = pointLayer.selectAll("circle").data(data);
  points.enter()
    .append("circle")
    .attr("r", 7)
    .call(d3.drag().on("drag", dragged))
    .merge(points)
    .attr("cx", d => xScale(d[0]))
    .attr("cy", d => yScale(d[1]))
    .attr("fill", d => errorColor(Math.abs(d[1] - (slope * d[0] + intercept))));

  // Stats
  const error = mse(data, slope, intercept);
  d3.select("#stats").html(
    `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)} &nbsp;|&nbsp; MSE = <span id="mse-value">${(prevError ?? error).toFixed(3)}</span>`
  );
  if (prevError !== null) {
    animateNumber(document.getElementById("mse-value"), prevError, error, 3);
  }
  prevError = error;
}

function dragged(event, d) {
  d[0] = xScale.invert(event.x);
  d[1] = yScale.invert(event.y);
  render(false); // no line transition while dragging 
}

d3.select("#reset").on("click", () => {
  data = initialData.map(d => [...d]);
  render();
});

d3.select("#add-noise").on("click", () => {
  data = data.map(([x, y]) => [x, Math.max(0, y + (Math.random() - 0.5) * 3)]);
  render();
});

d3.select("#toggle-residuals").on("change", function () {
  showResiduals = this.checked;
  render(false);
});

render();