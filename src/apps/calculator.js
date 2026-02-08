export function openCalculator({ makeWindow, state, saveState }) {
  makeWindow("calculator", "Calculator", (content, win) => {
    content.innerHTML = `<div class="app-shell">
      <div class="system-label">desk calculator</div>
      <input class="input-field" id="calcExpr" placeholder="e.g. 2*(3+4)" />
      <button class="btn-primary" id="calcRun" type="button">Compute</button>
      <div class="panel-dense" id="calcOut">recent: ${(state.calculatorHistory || []).slice(-3).join("\n") || "none"}</div>
    </div>`;
    const expr = content.querySelector('#calcExpr');
    const out = content.querySelector('#calcOut');
    content.querySelector('#calcRun').onclick = () => {
      const source = String(expr.value || '').trim();
      if (!source) return;
      if (!/^[\d+\-*/().\s]+$/.test(source)) {
        out.textContent = 'invalid expression';
        return;
      }
      let value = 'error';
      try {
        value = Function(`"use strict"; return (${source});`)();
      } catch {
        value = 'error';
      }
      if (!Array.isArray(state.calculatorHistory)) state.calculatorHistory = [];
      state.calculatorHistory.push(`${source} = ${value}`);
      state.calculatorHistory = state.calculatorHistory.slice(-12);
      out.textContent = state.calculatorHistory.join('\n');
      saveState();
      win?.setHealth?.("active");
    };
  });
}
