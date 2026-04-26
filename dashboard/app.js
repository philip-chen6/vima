const layers = {
  raw: {
    src: "./assets/frame_000001.jpg",
    caption: "Raw sampled hardhat frame.",
  },
  mask: {
    src: "./assets/mask_frame_000001.jpg",
    caption: "Object masks projected onto the frame.",
  },
  depth: {
    src: "./assets/depth_frame_000001.jpg",
    caption: "Depth-conditioned object labels from the memory pass.",
  },
};

let memory = null;
let answer = null;

const titleCase = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function setLayer(name) {
  const layer = layers[name];
  document.querySelector("#evidence-frame").src = layer.src;
  document.querySelector("#frame-caption").textContent = layer.caption;
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.layer === name);
  });
}

function formatTime(start, end) {
  if (start === end) return `${start.toFixed(1)}s`;
  return `${start.toFixed(1)}s - ${end.toFixed(1)}s`;
}

function renderStats() {
  const episodes = memory.episodes || [];
  const topConfidence = episodes.reduce((max, episode) => Math.max(max, episode.confidence || 0), 0);

  document.querySelector("#frame-count").textContent = memory.metadata.frames;
  document.querySelector("#episode-count").textContent = memory.metadata.episodes;
  document.querySelector("#event-count").textContent = memory.metadata.frame_events;
  document.querySelector("#top-confidence").textContent = topConfidence.toFixed(3);
}

function renderEpisodes(episodes = memory.episodes.slice(0, 6)) {
  const list = document.querySelector("#episode-list");
  list.innerHTML = "";

  episodes.forEach((episode) => {
    const item = document.createElement("article");
    item.className = "episode";
    item.innerHTML = `
      <div class="episode-top">
        <span class="pill">${episode.episode_id}</span>
        <span class="pill">${formatTime(episode.time_start_s, episode.time_end_s)}</span>
      </div>
      <h3>${titleCase(episode.event_type)}</h3>
      <p>${episode.observation}</p>
      <div class="episode-meta">
        <span class="pill">${episode.confidence.toFixed(3)} confidence</span>
        <span class="pill">${episode.frames.length} frames</span>
        <span class="pill">${episode.involved_tracks.length} tracks</span>
      </div>
    `;
    list.appendChild(item);
  });
}

function addBubble(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  document.querySelector("#chat-log").appendChild(bubble);
  bubble.scrollIntoView({ block: "end" });
}

function scoreEpisode(query, episode) {
  const haystack = [
    episode.event_type,
    episode.observation,
    episode.labels?.join(" "),
    episode.relations?.join(" "),
    episode.spatial_facts?.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return query
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean)
    .reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function localAnswer(query) {
  const ranked = [...memory.episodes]
    .map((episode) => ({ episode, score: scoreEpisode(query, episode) }))
    .sort((a, b) => b.score - a.score || b.episode.confidence - a.episode.confidence)
    .slice(0, 3)
    .map((item) => item.episode);

  renderEpisodes(ranked);

  const lead = ranked[0];
  if (!lead) return "No episodes are loaded yet.";

  return `Best match: ${titleCase(lead.event_type)} from ${formatTime(
    lead.time_start_s,
    lead.time_end_s,
  )}. ${lead.observation} Evidence frames: ${lead.evidence_frames
    .map((frame) => frame.frame)
    .slice(0, 4)
    .join(", ")}.`;
}

async function init() {
  const [memoryResponse, answerResponse] = await Promise.all([
    fetch("./data/episodic_memory.json"),
    fetch("./data/memory_answer.json"),
  ]);
  memory = await memoryResponse.json();
  answer = await answerResponse.json();

  renderStats();
  renderEpisodes();
  addBubble("user", answer.query);
  addBubble("assistant", answer.answer);
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => setLayer(button.dataset.layer));
});

document.querySelector("#query-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#query-input");
  const query = input.value.trim();
  if (!query) return;

  addBubble("user", query);
  addBubble("assistant", localAnswer(query));
});

init().catch((error) => {
  addBubble("assistant", `Dashboard failed to load memory files: ${error.message}`);
});
