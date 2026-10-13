// Interactive typing progress for /typing.html.
//
// Reads the session summaries that the typing-progress repo publishes and draws
// headline numbers, a practice calendar, a speed chart, and a session table.
// If anything fails, the static images already on the page stay in place.

(function () {
  const root = document.getElementById("typing-app");
  if (!root || !window.fetch) {
    return;
  }

  const DATA_URL = "/typing-progress/sessions.json";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  fetch(DATA_URL, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    })
    .then((sessions) => {
      if (Array.isArray(sessions)) {
        render(sessions);
      }
    })
    .catch(() => {});

  // ---------------------------------------------------------------------------
  // Data

  function summarizeDays(sessions) {
    const days = new Map();
    for (const s of sessions) {
      const start = new Date(s.start);
      const key = dayKey(start);
      let day = days.get(key);
      if (!day) {
        day = { key, date: startOfDay(start), minutes: 0, sessions: 0, lessons: 0, wpmMinutes: 0, accMinutes: 0, best: 0 };
        days.set(key, day);
      }
      day.minutes += s.minutes;
      day.sessions += 1;
      day.lessons += s.lessons;
      day.wpmMinutes += s.avgWpm * s.minutes;
      day.accMinutes += s.accuracy * s.minutes;
      day.best = Math.max(day.best, s.bestWpm);
    }
    for (const day of days.values()) {
      day.wpm = day.minutes > 0 ? day.wpmMinutes / day.minutes : 0;
      day.accuracy = day.minutes > 0 ? day.accMinutes / day.minutes : 0;
    }
    return days;
  }

  // ---------------------------------------------------------------------------
  // Page

  function render(sessions) {
    const days = summarizeDays(sessions);
    const points = [...days.values()].sort((a, b) => a.date - b.date);

    const stats = el("div", "typing-stats");
    const calendar = el("div", "typing-figure");
    const legend = el("div", "typing-legend");
    const ranges = el("div", "typing-ranges");
    const speed = el("div", "typing-figure");
    const table = sessionTable(sessions);

    root.replaceChildren(
      stats,
      heading("Practice"),
      calendar,
      legend,
      heading("Speed"),
      ranges,
      speed,
      table,
    );

    renderStats(stats, sessions, points);
    setInterval(() => renderStats(stats, sessions, points), 60 * 1000);

    let range = "all";
    for (const [value, label] of [["30", "30 days"], ["90", "90 days"], ["all", "All time"]]) {
      const button = el("button", "typing-range", label);
      button.type = "button";
      button.setAttribute("aria-pressed", String(value === range));
      button.addEventListener("click", () => {
        range = value;
        for (const b of ranges.children) {
          b.setAttribute("aria-pressed", String(b === button));
        }
        drawSpeed(speed, points, range);
      });
      ranges.append(button);
    }

    const draw = () => {
      drawCalendar(calendar, legend, days);
      drawSpeed(speed, points, range);
    };
    // Redraw only when the width changes, not when the table opens.
    let drawnWidth = root.clientWidth;
    draw();
    new ResizeObserver(() => {
      if (root.clientWidth !== drawnWidth) {
        drawnWidth = root.clientWidth;
        draw();
      }
    }).observe(root);
  }

  function renderStats(container, sessions, points) {
    if (points.length === 0) {
      container.replaceChildren(el("p", "typing-empty", "No practice sessions yet."));
      return;
    }
    const latest = points[points.length - 1];
    const bestSession = sessions.reduce((a, b) => (b.bestWpm > a.bestWpm ? b : a));
    const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
    const lastEnd = new Date(sessions[sessions.length - 1].end);
    container.replaceChildren(
      stat(`${Math.round(latest.wpm)} WPM`, "Latest speed", `average on ${formatDate(latest.date)}`),
      stat(`${Math.round(bestSession.bestWpm)} WPM`, "Best lesson", formatDate(new Date(bestSession.start))),
      stat(formatMinutes(totalMinutes), "Time practiced", `${plural(sessions.length, "session")} on ${plural(points.length, "day")}`),
      stat(timeAgo(lastEnd), "Last practiced", formatDate(lastEnd)),
    );
  }

  function stat(value, label, detail) {
    const tile = el("div", "typing-stat");
    tile.append(el("div", "typing-stat-label", label), el("div", "typing-stat-value", value), el("div", "typing-stat-detail", detail));
    return tile;
  }

  // ---------------------------------------------------------------------------
  // Calendar

  function drawCalendar(container, legend, days) {
    const width = container.clientWidth;
    const labelWidth = 30;
    const top = 18;
    const gap = 3;
    // Show the whole year when the cells fit at a usable size; on narrow
    // screens show fewer weeks instead of shrinking the cells further.
    const fit = Math.floor((width - labelWidth + gap) / 53) - gap;
    const cell = fit >= 8 ? Math.min(fit, 12) : 10;
    const step = cell + gap;
    const weeks = Math.min(53, Math.floor((width - labelWidth + gap) / step));

    const today = startOfDay(new Date());
    const first = new Date(today);
    first.setDate(first.getDate() - today.getDay() - (weeks - 1) * 7);

    const svg = svgEl("svg", { width, height: top + 7 * step, class: "typing-svg" });
    svg.setAttribute("tabindex", "0");
    svg.setAttribute("role", "img");

    const cells = [];
    const monthLabels = [];
    let total = 0;
    let practiced = 0;
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(first);
        date.setDate(first.getDate() + w * 7 + d);
        if (date > today) {
          break;
        }
        if (d === 0 && date.getMonth() !== lastMonth) {
          lastMonth = date.getMonth();
          monthLabels.push({ w, name: MONTHS[lastMonth] });
        }
        const day = days.get(dayKey(date));
        const minutes = day ? day.minutes : 0;
        if (minutes > 0) {
          total += minutes;
          practiced += 1;
        }
        const rect = svgEl("rect", {
          x: labelWidth + w * step,
          y: top + d * step,
          width: cell,
          height: cell,
          rx: 2,
          class: `typing-cell typing-l${level(minutes)}`,
        });
        svg.append(rect);
        cells.push({ w, d, date, day, rect });
      }
    }
    // Skip a month label that would run into the next one, as GitHub does.
    monthLabels.forEach(({ w, name }, i) => {
      const next = monthLabels[i + 1];
      if ((next ? next.w : weeks) - w >= 3) {
        svg.append(svgText(name, labelWidth + w * step, top - 6, "typing-axis"));
      }
    });
    for (const [d, name] of [[1, "Mon"], [3, "Wed"], [5, "Fri"]]) {
      svg.append(svgText(name, 0, top + d * step + cell - 2, "typing-axis"));
    }

    const period = weeks >= 52 ? "in the last year" : `in the last ${weeks} weeks`;
    svg.setAttribute("aria-label", `Practice calendar: ${formatMinutes(total)} on ${plural(practiced, "day")} ${period}. Use the arrow keys to move between days.`);

    const tip = tooltip();
    container.replaceChildren(svg, tip.node);

    let active = null;
    const show = (c) => {
      if (active) {
        active.rect.classList.remove("is-active");
      }
      active = c;
      if (!c) {
        tip.hide();
        return;
      }
      c.rect.classList.add("is-active");
      const lines = c.day
        ? [
            [`${Math.round(c.day.minutes)} min`, ` on ${formatLongDate(c.date)}`],
            [`${plural(c.day.lessons, "lesson")} · ${Math.round(c.day.wpm)} WPM avg · best ${Math.round(c.day.best)}`],
          ]
        : [["No practice", ` on ${formatLongDate(c.date)}`]];
      tip.show(lines, labelWidth + c.w * step + cell / 2, top + c.d * step, width);
    };
    const at = (w, d) => cells.find((c) => c.w === w && c.d === d) || null;

    // The whole grid step around a cell is its hit area, not just the square.
    svg.addEventListener("pointermove", (event) => {
      const box = svg.getBoundingClientRect();
      const w = Math.floor((event.clientX - box.left - labelWidth + gap / 2) / step);
      const d = Math.floor((event.clientY - box.top - top + gap / 2) / step);
      show(at(w, d));
    });
    svg.addEventListener("pointerleave", () => show(null));
    svg.addEventListener("focus", () => show(cells[cells.length - 1]));
    svg.addEventListener("blur", () => show(null));
    svg.addEventListener("keydown", (event) => {
      if (!active) {
        return;
      }
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        const next = at(active.w + move[0], active.d + move[1]);
        if (next) {
          show(next);
        }
      }
    });

    const summary = el("span", "typing-legend-summary", `${formatMinutes(total)} of practice on ${plural(practiced, "day")} ${period}`);
    const scale = el("span", "typing-legend-scale");
    scale.append("Less");
    for (let l = 0; l <= 4; l++) {
      const swatch = el("span", `typing-swatch typing-l${l}`);
      swatch.title = ["No practice", "Under 10 min", "10–19 min", "20–39 min", "40+ min"][l];
      scale.append(swatch);
    }
    scale.append("More");
    legend.replaceChildren(summary, scale);
  }

  function level(minutes) {
    if (minutes <= 0) return 0;
    if (minutes < 10) return 1;
    if (minutes < 20) return 2;
    if (minutes < 40) return 3;
    return 4;
  }

  // ---------------------------------------------------------------------------
  // Speed chart

  function drawSpeed(container, allPoints, range) {
    const width = container.clientWidth;
    const height = 240;
    const left = 34;
    const right = 70;
    const top = 12;
    const bottom = 26;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const today = startOfDay(new Date());
    const xMax = today.getTime();
    let xMin;
    let points;
    if (range === "all") {
      points = allPoints;
      xMin = points.length > 0 ? Math.min(points[0].date.getTime(), xMax - 14 * DAY_MS) : xMax - 14 * DAY_MS;
    } else {
      xMin = xMax - Number(range) * DAY_MS;
      points = allPoints.filter((p) => p.date.getTime() >= xMin);
    }

    const svg = svgEl("svg", { width, height, class: "typing-svg" });
    container.replaceChildren(svg);
    if (points.length === 0) {
      svg.append(svgText("No practice in this period", left + plotWidth / 2, top + plotHeight / 2, "typing-axis", "middle"));
      return;
    }

    const yMax = niceCeil(Math.max(...points.map((p) => p.wpm)) * 1.1);
    const x = (t) => left + ((t - xMin) / (xMax - xMin)) * plotWidth;
    const y = (v) => top + plotHeight - (v / yMax) * plotHeight;

    for (let i = 0; i <= 4; i++) {
      const v = (yMax / 4) * i;
      svg.append(svgEl("line", { x1: left, x2: left + plotWidth, y1: y(v), y2: y(v), class: "typing-grid" }));
      svg.append(svgText(String(Math.round(v)), left - 8, y(v) + 4, "typing-axis", "end"));
    }
    const ticks = Math.max(2, Math.min(5, Math.floor(plotWidth / 110)));
    for (let i = 0; i <= ticks; i++) {
      const t = xMin + ((xMax - xMin) / ticks) * i;
      svg.append(svgText(formatDate(new Date(t)), x(t), height - 6, "typing-axis", i === 0 ? "start" : i === ticks ? "end" : "middle"));
    }

    const crosshair = svgEl("line", { y1: top, y2: top + plotHeight, class: "typing-crosshair" });
    crosshair.style.display = "none";
    svg.append(crosshair);

    if (points.length > 1) {
      const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date.getTime()).toFixed(1)},${y(p.wpm).toFixed(1)}`).join(" ");
      svg.append(svgEl("path", { d, class: "typing-line" }));
    }
    const dots = points.map((p) => {
      const dot = svgEl("circle", { cx: x(p.date.getTime()), cy: y(p.wpm), r: 4, class: "typing-dot" });
      svg.append(dot);
      return dot;
    });
    const latest = points[points.length - 1];
    svg.append(svgText(`${Math.round(latest.wpm)} WPM`, x(latest.date.getTime()) + 9, y(latest.wpm) + 4, "typing-direct-label"));

    svg.setAttribute("tabindex", "0");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Average typing speed per practice day, latest ${Math.round(latest.wpm)} WPM. Use the arrow keys to move between days.`);

    const tip = tooltip();
    container.append(tip.node);

    let active = -1;
    const show = (i) => {
      if (active >= 0) {
        dots[active].classList.remove("is-active");
      }
      active = i;
      if (i < 0) {
        crosshair.style.display = "none";
        tip.hide();
        return;
      }
      const p = points[i];
      const px = x(p.date.getTime());
      crosshair.setAttribute("x1", px);
      crosshair.setAttribute("x2", px);
      crosshair.style.display = "";
      dots[i].classList.add("is-active");
      tip.show(
        [
          [`${Math.round(p.wpm)} WPM`, ` avg on ${formatLongDate(p.date)}`],
          [`Best lesson ${Math.round(p.best)} WPM · ${Math.round(p.accuracy)}% accuracy`],
          [`${plural(p.lessons, "lesson")} · ${Math.round(p.minutes)} min`],
        ],
        px,
        y(p.wpm) - 6,
        width,
      );
    };

    // The crosshair snaps to the nearest practice day, so the pointer never
    // has to land on a dot.
    svg.addEventListener("pointermove", (event) => {
      const box = svg.getBoundingClientRect();
      const px = event.clientX - box.left;
      let nearest = 0;
      for (let i = 1; i < points.length; i++) {
        if (Math.abs(x(points[i].date.getTime()) - px) < Math.abs(x(points[nearest].date.getTime()) - px)) {
          nearest = i;
        }
      }
      show(nearest);
    });
    svg.addEventListener("pointerleave", () => show(-1));
    svg.addEventListener("focus", () => show(points.length - 1));
    svg.addEventListener("blur", () => show(-1));
    svg.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" && active > 0) {
        event.preventDefault();
        show(active - 1);
      } else if (event.key === "ArrowRight" && active < points.length - 1) {
        event.preventDefault();
        show(active + 1);
      }
    });
  }

  function niceCeil(value) {
    const steps = [20, 40, 60, 80, 100, 120, 160, 200];
    return steps.find((s) => s >= value) || Math.ceil(value / 40) * 40;
  }

  // ---------------------------------------------------------------------------
  // Session table

  function sessionTable(sessions) {
    const details = el("details", "typing-table");
    details.append(el("summary", null, "All sessions"));
    const table = el("table");
    const head = el("tr");
    for (const name of ["Date", "Lessons", "Time", "Avg WPM", "Best WPM", "Accuracy"]) {
      head.append(el("th", null, name));
    }
    table.append(el("thead"));
    table.tHead.append(head);
    const body = el("tbody");
    for (const s of [...sessions].reverse()) {
      const start = new Date(s.start);
      const row = el("tr");
      for (const value of [
        `${formatDate(start)}, ${start.getFullYear()} ${pad(start.getHours())}:${pad(start.getMinutes())}`,
        String(s.lessons),
        formatMinutes(s.minutes),
        String(Math.round(s.avgWpm)),
        String(Math.round(s.bestWpm)),
        `${s.accuracy}%`,
      ]) {
        row.append(el("td", null, value));
      }
      body.append(row);
    }
    table.append(body);
    details.append(table);
    return details;
  }

  // ---------------------------------------------------------------------------
  // Tooltip

  function tooltip() {
    const node = el("div", "typing-tip");
    node.setAttribute("role", "tooltip");
    node.hidden = true;
    return {
      node,
      show(lines, x, y, width) {
        node.replaceChildren(
          ...lines.map(([strong, rest], i) => {
            const line = el("div", i === 0 ? "typing-tip-head" : "typing-tip-line");
            if (rest !== undefined) {
              line.append(el("strong", null, strong), rest);
            } else {
              line.append(strong);
            }
            return line;
          }),
        );
        node.hidden = false;
        const half = node.offsetWidth / 2;
        node.style.left = `${clamp(x, half, width - half)}px`;
        node.style.top = `${y}px`;
      },
      hide() {
        node.hidden = true;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function heading(text) {
    return el("h2", null, text);
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) {
      node.setAttribute(name, value);
    }
    return node;
  }

  function svgText(text, x, y, className, anchor) {
    const node = svgEl("text", { x, y, class: className });
    if (anchor) node.setAttribute("text-anchor", anchor);
    node.textContent = text;
    return node;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function dayKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function formatDate(date) {
    return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  }

  function formatLongDate(date) {
    return `${WEEKDAYS[date.getDay()]}, ${formatDate(date)}`;
  }

  function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  }

  function plural(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
  }

  function timeAgo(date) {
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${plural(hours, "hour")} ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }
})();
