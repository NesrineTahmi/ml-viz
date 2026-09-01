// Initial toy dataset
let data = [
  [1, 2], [2, 3.1], [3, 3.9], [4, 5.2], [5, 5.8],
  [6, 7.1], [7, 7.5], [8, 9.2], [9, 9.8]
];

const { g, innerWidth, innerHeight } = createChart("#viz");

const xScale = d3.scaleLinear().domain([0, 10]).range([0, innerWidth]);
const yScale = d3.scaleLinear().domain([0, 11]).range([innerHeight, 0]);

drawAxes(g, xScale, yScale, innerHeight);

const lineEl = g.append("line")
  .attr("stroke", "var(--color-line)")
  .attr("stroke-width", 2);

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

function render() {
  const { slope, intercept } = leastSquares(data);

  lineEl
    .attr("x1", xScale(0))
    .attr("y1", yScale(intercept))
    .attr("x2", xScale(10))
    .attr("y2", yScale(slope * 10 + intercept));

  const points = g.selectAll("circle").data(data);

  points.enter()
    .append("circle")
    .attr("r", 7)
    .attr("fill", "var(--color-point)")
    .call(d3.drag().on("drag", dragged))
    .merge(points)
    .attr("cx", d => xScale(d[0]))
    .attr("cy", d => yScale(d[1]));

  const error = mse(data, slope, intercept);
  d3.select("#stats").html(
    `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)} &nbsp;|&nbsp; MSE = ${error.toFixed(3)}`
  );
}

function dragged(event, d) {
  d[0] = xScale.invert(event.x);
  d[1] = yScale.invert(event.y);
  render();
}

d3.select("#reset").on("click", () => {
  data = [
    [1, 2], [2, 3.1], [3, 3.9], [4, 5.2], [5, 5.8],
    [6, 7.1], [7, 7.5], [8, 9.2], [9, 9.8]
  ];
  render();
});

d3.select("#add-noise").on("click", () => {
  data = data.map(([x, y]) => [x, Math.max(0, y + (Math.random() - 0.5) * 3)]);
  render();
});

render();