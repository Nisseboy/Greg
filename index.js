const boardElem = document.getElementsByClassName("board")[0];
let boardBox;

const lineCanvas = document.getElementById("line-canvas");
const ctx = lineCanvas.getContext("2d");
let previewLine = {};

let machines = {};
let currentI = 0;

function resize() {
  boardBox = boardElem.getBoundingClientRect();
  lineCanvas.width = window.innerWidth;
  lineCanvas.height = window.innerHeight;
          
  redrawLines();
}
window.onresize = resize;
resize();

createMachine();
function createMachine(copyOf) {
  let id = currentI++;
  let machine = {
    id,
    name: "macerator",
    inputs: [{amount: 1, name: "cobblestone", to: []}],
    outputs: [{amount: 1, name: "gravel", to: []}],
    time: 0.8,
    rfpt: 16,
    x: 0.2,
    y: 0.2,
    elem: undefined,
  };

  if (copyOf) {
    if (copyOf.name) machine.name = copyOf.name;
    if (copyOf.time) machine.time = copyOf.time;
    if (copyOf.rfpt) machine.rfpt = copyOf.rfpt;
    if (copyOf.x) machine.x = copyOf.x;
    if (copyOf.y) machine.y = copyOf.y;
  
    if (copyOf.inputs) {
      machine.inputs = [];
      for (let i of copyOf.inputs) {
        machine.inputs.push({amount: i.amount, name: i.name, to: []});
      }
    }
    if (copyOf.outputs) {
      machine.outputs = [];
      for (let i of copyOf.outputs) {
        machine.outputs.push({amount: i.amount, name: i.name, to: []});
      }
    }
  }
  
  machines[id] = machine;

  redrawBoard();

  return machine;
}
createMachine({x: 0.4, y: 0.2, inputs: [{amount: 1, name: "gravel"}], outputs: [{amount: 1, name: "sand"}]});

machines[0].outputs[0].to.push({i: 1, n: 0});
machines[1].inputs[0].to.push({i: 0, n: 0});

createMachine({x: 0.6, y: 0.2, time: 10, name: "output", inputs: [{amount: 200, name: "sand"}], outputs: []});

machines[1].outputs[0].to.push({i: 2, n: 0});
machines[2].inputs[0].to.push({i: 1, n: 0});

redrawBoard();

boardElem.addEventListener("mouseup", e => {
  if (e.target != boardElem || e.button != 2) return;
  createContextMenu(e.clientX, e.clientY, [{name: "Create Machine", onclick: e2 => {
    createMachine({x: e.clientX / boardBox.width, y: e.clientY / boardBox.height});
  }}]);
});

function redrawBoard() {
  for (let i in machines) {
    machines[i].amountNeeded = 0;
    machines[i].productionNeeded = [];
  }

  for (let i in machines) {
    let m = machines[i];
    if (m.outputs.length != 0) continue;

    function getTier(rfpt) {
      let tiers = ["LV", "MV", "HV", "EV", "IV", "LuV", "ZPM", "UV", "MAX"];
      for (let i = 0; i < tiers.length; i++) {
        if (32 * Math.pow(4, i) >= rfpt) return tiers[i];
      }
    }

    function calculateAmountNeeded(m) {
      m.inputs.forEach(input => {
        input.to.forEach(to => {
          let previousMachine = machines[to.i];
          let previousOutput = previousMachine.outputs[to.n];

          if (!previousMachine.productionNeeded[to.n]) previousMachine.productionNeeded[to.n] = 0;
          previousMachine.productionNeeded[to.n] += input.amount / m.time / input.to.length * (m.amountNeeded || 1);

          let baseOutput = previousOutput.amount / previousMachine.time;
          previousMachine.amountNeeded = previousMachine.productionNeeded / baseOutput;

          let rfpt = previousMachine.rfpt;
          let needed = previousMachine.amountNeeded;
          let time = previousMachine.time;
          previousMachine.productionInfo = "";

          for (let j = 0; j < 9; j++) {
            previousMachine.productionInfo += `${needed} ${getTier(rfpt)} machines, total ${rfpt * needed} FE/tick<br>`;

            if (needed <= 1) break;

            needed /= (previousMachine.rfpt > 16?2.8:2);
            rfpt *= 4;
            time /= (previousMachine.rfpt > 16?2.8:2);

            if (time < 0.05) break;
          }

          calculateAmountNeeded(previousMachine);
        });
      });
    }

    calculateAmountNeeded(m);
  }

  for (let i in machines) {
    let m = machines[i];
    if (m.elem) m.elem.remove();

    let elemString = `
<div class="machine" style="top: ${m.y * 100}%; left: ${m.x * 100}%">
  <input type="text" class="name" placeholder="Machine Name" value="${m.name}" onchange="changeValue(${i}, 0, 0, this)">

  <div class="inputs-box">
    <span>Inputs</span>
    ${m.inputs.map((e, n) => {
      return `
    <div class="value">
      <input type="text" class="amount" value="${e.amount}" onchange="changeValue(${i}, 1, ${n}, this)">
      <span>x</span>
      <input type="text" class="name" value="${e.name}" onchange="changeValue(${i}, 2, ${n}, this)">
      <button class="remove" onclick="removeIORow(${i}, false, ${n})">x</button>
      <div class="connector in" type="peeenis" data-i="${i}" data-n="${n}"></div>
    </div>
    `;
    }).join("")}
    <div class="value">
      <button class="add" onclick="addIORow(${i}, false)">+</button>
    </div>
  </div>

  <div class="outputs-box">
    <span>Outputs</span>
    ${m.outputs.map((e, n) => {
      return `
    <div class="value">
      <input type="text" class="amount" value="${e.amount}" onchange="changeValue(${i}, 3, ${n}, this)">
      <span>x</span>
      <input type="text" class="name" value="${e.name}" onchange="changeValue(${i}, 4, ${n}, this)">
      <button class="remove" onclick="removeIORow(${i}, true, ${n})">x</button>
      <div class="connector out" type="peeenis" data-i="${i}" data-n="${n}"></div>
    </div>
    `;
    }).join("")}
    <div class="value">
      <button class="add" onclick="addIORow(${i}, true)">+</button>
    </div>
  </div>
  
  <div class="time-box">
    <span>Time (s): </span>
    <input type="text" class="time" value="${m.time}" onchange="changeValue(${i}, 5, 0, this)">
    <span>EU/t: </span>
    <input type="text" class="rfpt" value="${m.rfpt}" onchange="changeValue(${i}, 6, 0, this)">
    
    <div class="production-info-box">${m.productionInfo || ""}</div>
  </div>
</div>`;

    m.elem = createElem(elemString);
    
    m.elem.addEventListener("mousedown", e => {
      if (e.target.type != undefined || e.button != 0 || e.target.classList.contains("connector")) return;
      let box = m.elem.getBoundingClientRect();

      mouseDrag(
        {x: box.x - e.clientX, y: box.y - e.clientY}, 
        (e, data) => {
          let x = (data.x + e.clientX) / boardBox.width;
          let y = (data.y + e.clientY) / boardBox.height;
          
          m.x = x;
          m.y = y;

          m.elem.style.top = y * 100 + "%";
          m.elem.style.left = x * 100 + "%";
          
          redrawLines();
        },
        (e, data) => {

        },
      );
    });

    for (let c of m.elem.getElementsByClassName("connector")) {
      let outputSide = c.classList.contains("out");
      let connector = machines[c.dataset.i][outputSide?"outputs":"inputs"][c.dataset.n];
      c.addEventListener("mousedown", e => {
        if (e.button == 2) {
          for (let j in connector.to) {
            let connection = connector.to[j];
            let other = machines[connection.i][!outputSide?"outputs":"inputs"][connection.n]
            for (let k = 0; k < other.to.length; k++) {
              let connection2 = other.to[k];
              if (connection2.i == i && connection2.n == c.dataset.n) {other.to.splice(k, 1); k--};
            }
            connector.to.splice(j, 1);
            redrawBoard();
          }
        }
        if (e.button != 0) return;
  
        previewLine.i = c.dataset.i;
        previewLine.n = c.dataset.n;
        previewLine.outputSide = outputSide;
        mouseDrag(
          {}, 
          (e, data) => {
            previewLine.x = e.clientX;
            previewLine.y = e.clientY;
            
            redrawLines();
          },
          (e, data) => {
            previewLine.x = undefined;
            previewLine.y = undefined;

            let under = document.elementFromPoint(e.clientX, e.clientY);
            if (under?.classList.contains("connector") && under.classList.contains("out") != outputSide) {
              let other = machines[under.dataset.i][!outputSide?"outputs":"inputs"][under.dataset.n];
              for (let i of other.to) {
                if (i.i == c.dataset.i && i.n == c.dataset.n) {
                  redrawLines();
                  return;
                }
              }
              other.to.push({i: c.dataset.i, n: c.dataset.n});
              connector.to.push({i: under.dataset.i, n: under.dataset.n});
            }

            redrawBoard();
          },
        );
      });
    }

    m.elem.addEventListener("mouseup", e => {
      if (e.button != 2 || e.target.classList.contains("connector")) return;
      createContextMenu(e.clientX, e.clientY, [
      {name: "Duplicate Machine", onclick: e2 => {
        let m2 = createMachine(m);
        m2.x += 0.01;
        m2.y += 0.01;
        redrawBoard();
      }},
      {name: "Remove Machine", onclick: e2 => {
        delete machines[i];
        m.elem.remove();
        redrawBoard();
      }},
    ]);
    });
  }
  redrawLines();
}

function redrawLines() {
  ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
  ctx.beginPath();

  function drawLine(sourceMachine, sourceOutputIndex, connection) {
    let box1 = sourceMachine.elem.getElementsByClassName(`connector ${(connection.outputSide != undefined && !connection.outputSide)?"in":"out"}`)[sourceOutputIndex].getBoundingClientRect();
    let p1 = {x: box1.x + box1.width / 2, y: box1.y + box1.height / 2};
    ctx.moveTo(p1.x, p1.y);

    let box2;
    if (connection.x != undefined) box2 = {x: connection.x, y: connection.y, width: 0, height: 0}
    else box2 = machines[connection.i].elem.getElementsByClassName("connector in")[connection.n].getBoundingClientRect();
    let p2 = {x: box2.x + box2.width / 2, y: box2.y + box2.height / 2};
    ctx.lineTo(p2.x, p2.y);

    let diff = {x: p2.x - p1.x, y: p2.y - p1.y};
    let angle = Math.atan2(diff.y, diff.x);
    let center = {x: p1.x + diff.x / 2, y: p1.y + diff.y / 2}
    let mult = (connection.outputSide != undefined && !connection.outputSide)?-1:1;

    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x - Math.cos(angle - 1) * 10 * mult, center.y - Math.sin(angle - 1) * 10 * mult);
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x - Math.cos(angle + 1) * 10 * mult, center.y - Math.sin(angle + 1) * 10 * mult);
  }
  
  for (let i in machines) {
    let sourceMachine = machines[i];
    for (let j in sourceMachine.outputs) {
      let output = sourceMachine.outputs[j];
      for (let to of output.to) {
        drawLine(sourceMachine, j, to);
      }
    }
  }
  
  if (previewLine.x != undefined) drawLine(machines[previewLine.i], previewLine.n, previewLine);

  ctx.lineWidth = 2;
  ctx.stroke();
}

function mouseDrag(data, move, up) {
  const mouseMove = e => {
    move(e, data);
  }
  const mouseUp = e => {
    document.removeEventListener("mousemove", mouseMove);
    document.removeEventListener("mouseup", mouseUp);
    up(e, data);
  }

  document.addEventListener("mousemove", mouseMove);
  document.addEventListener("mouseup", mouseUp);
}

function removeIORow(i, outputSide, n) {
  let m = machines[i];
  if (outputSide) m.outputs.splice(n, 1);
  else m.inputs.splice(n, 1);

  redrawBoard();
}

function addIORow(i, outputSide) {
  let m = machines[i];
  if (outputSide) m.outputs.push({amount: 1, name: "", to: []});
  else m.inputs.push({amount: 1, name: "", to: []});

  redrawBoard();
}

function changeValue(i, part, n, e) {
  let value = e.value;
  let m = machines[i];
       if (part == 0) m.name = value;
  else if (part == 1) m.inputs[n].amount = value;
  else if (part == 2) m.inputs[n].name = value;
  else if (part == 3) m.outputs[n].amount = value;
  else if (part == 4) m.outputs[n].name = value;
  else if (part == 5) m.time = value;
  else if (part == 6) m.rfpt = value;

  redrawBoard();
}

let currentContextMenu;
function createContextMenu(x, y, buttons) {
  if (currentContextMenu) currentContextMenu.remove();

  currentContextMenu = createElem(`
  <div class="context-menu" style="top: ${y}px; left: ${x}px"></div>
  `, document.body);
  if (!currentContextMenu) return;

  for (let e of buttons) {
    let elem = createElem(`
    <button class="button">${e.name}</button>
    `, currentContextMenu);
    
    elem?.addEventListener("click", ()=>{
      currentContextMenu.remove();
      e.onclick();
    });
  };
}
document.addEventListener("mousedown", e => {
  if (currentContextMenu && e.target?.className != "button") currentContextMenu.remove();
});
document.oncontextmenu = e => {e.preventDefault; return false};

function createElem(text, parent = boardElem) {
  parent.insertAdjacentHTML("beforeend", text);

  return parent.lastElementChild;
}

