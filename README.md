# ml-viz - Supervised Machine Learning, Visualized

Interactive visualizations for understanding core supervised learning algorithms: drag points, adjust sliders, and watch the model refit in real time. 

**[Live demo →](https://nesrinetahmi.github.io/ml-viz/)**

![Built with D3.js](https://img.shields.io/badge/built%20with-D3.js-E0575B) 

---

## What's inside

| Demo | What you can do |
|---|---|
| **Linear Regression** | Drag data points and watch the least-squares line and residuals update live |
| **Logistic Regression** | Add points on either side and watch the decision boundary and probability heatmap bend to fit |
| **Decision Trees** | Adjust max depth and trace exactly which splits classify a clicked point |
| **K-Nearest Neighbors** | Change *k* and click anywhere to see the neighbor vote and decision regions shift |
| **Evaluation Metrics** | Drag the classification threshold and watch the confusion matrix, precision/recall/F1, and ROC curve respond |

---

## Running it locally

```bash
git clone https://github.com/YOUR-USERNAME/ml-viz.git
cd ml-viz
python3 -m http.server 8000
```

Then open `http://localhost:8000/` (root, for the landing page) or any demo directly, e.g. `http://localhost:8000/linear-regression/` 

No Python? Use Node instead:

```bash
npx serve
```

---

## Project structure

```
ml-viz/
├── index.html                      Landing page linking all five demos
├── home.css                        Landing page styles
├── README.md
│
├── shared/
│   ├── styles.css                  Shared theme (colors, fonts, layout) used by every demo
│   └── utils.js                    Shared math + D3 chart helpers (scales, axes, grid, metrics)
│
├── linear-regression/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── logistic-regression/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── decision-trees/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── knn/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
└── evaluation-metrics/
    ├── index.html
    ├── script.js
    └── style.css
```

---

## Tech

- **[D3.js](https://d3js.org/)** (v7, via CDN) for all rendering and interaction 
- Plain HTML/CSS/JS throughout, every file runs directly in the browser
- Hosted on **GitHub Pages**, deployed via the built-in "Static HTML" Actions workflow
