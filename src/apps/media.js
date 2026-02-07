import { completeObjective } from "../state.js";

export function openMedia({ makeWindow, files, state, saveState }) {
  makeWindow("media", "Media Player", (content) => {
    function render() {
      const metadataExtracted = !!state.unlocked.mediaMetadata;
      const partialExtracted = !!state.unlocked.mediaPartial;
      const fullyUnlocked = !!state.unlocked.mediaReveal;

      const stageText = fullyUnlocked
        ? "Decode complete: witness channel unlocked."
        : partialExtracted
          ? "Partial decode complete: printable structure detected."
          : metadataExtracted
            ? "Metadata indexed: extraction parameters available."
            : "Codec pack missing. Begin staged decode.";

      content.innerHTML = `<div><strong>Loaded media:</strong> hallway_capture.avi</div>
        <div class='notice'>${stageText}</div>
        <div id='mediaActions' style='margin:8px 0'></div>
        <pre id='mediaPreview' style='white-space:pre-wrap; margin-top:8px'></pre>`;

      const actions = content.querySelector("#mediaActions");
      const preview = content.querySelector("#mediaPreview");

      const base = [files["/media/hallway_capture.avi"]];
      if (metadataExtracted) base.push("[metadata] source camera drift: +47m, checksum class: cam2-compatible");
      if (partialExtracted) base.push("[partial extract] frame delta hints at hidden payload in cam2_20030418.dat");
      if (fullyUnlocked) base.push("[unlock] secondary channel now visible in explorer and terminal strings output");
      preview.textContent = base.join("\n");

      if (!metadataExtracted) {
        const btn = document.createElement("button");
        btn.textContent = "Scan metadata";
        btn.onclick = () => {
          state.unlocked.mediaMetadata = true;
          saveState();
          render();
        };
        actions.appendChild(btn);
      }

      if (metadataExtracted && !partialExtracted) {
        const btn = document.createElement("button");
        btn.style.marginLeft = "8px";
        btn.textContent = "Run partial extract";
        btn.onclick = () => {
          state.unlocked.mediaPartial = true;
          saveState();
          render();
        };
        actions.appendChild(btn);
      }

      if (partialExtracted && !fullyUnlocked) {
        const btn = document.createElement("button");
        btn.style.marginLeft = "8px";
        btn.textContent = "Unlock reveal channel";
        btn.onclick = () => {
          state.unlocked.mediaReveal = true;
          completeObjective(state, "decode_cam2");
          saveState();
          render();
        };
        actions.appendChild(btn);
      }
    }

    render();
  });
}
