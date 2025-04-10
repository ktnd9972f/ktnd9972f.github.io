const GOJUUON = [
    ["ア", "イ", "ウ", "エ", "オ"],
    ["カ", "キ", "ク", "ケ", "コ"],
    ["サ", "シ", "ス", "セ", "ソ"],
    ["タ", "チ", "ツ", "テ", "ト"],
    ["ナ", "ニ", "ヌ", "ネ", "ノ"],
    ["ハ", "ヒ", "フ", "ヘ", "ホ"],
    ["マ", "ミ", "ム", "メ", "モ"],
    ["ヤ", "", "ユ", "", "ヨ"],
    ["ラ", "リ", "ル", "レ", "ロ"],
    ["ワ", "", "ヲ", "", "ン"]
  ];



// 初期表示
let word1 = "", word2 = "";
let startTime = null;

// 疑似乱数生成
function seededRandom(seed) {
    let x = seed | 0;
    return function () {
      x ^= x << 13;
      x ^= x >> 17;
      x ^= x << 5;
      return ((x >>> 0) / 0xFFFFFFFF);
    };
  }

function getTodayWordPair() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${(date.getMonth() + 1)
    .toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;

  // seed値を文字列から生成
  let seed = 0;
  for (let i = 0; i < ymd.length; i++) {
    seed = (seed * 31 + ymd.charCodeAt(i)) >>> 0;
  }

  const rng = seededRandom(seed);

  // シャッフルして2つ選ぶ
  const shuffled = [...WORD_LIST].sort(() => rng() - 0.5);
  return [shuffled[0], shuffled[1]];
}

function normalizeKana(str) {
    const dakutenMap = {
 //     が: "か", ぎ: "き", ぐ: "く", げ: "け", ご: "こ",
 //     ざ: "さ", じ: "し", ず: "す", ぜ: "せ", ぞ: "そ",
 //     だ: "た", ぢ: "ち", づ: "つ", で: "て", ど: "と",
 //     ば: "は", び: "ひ", ぶ: "ふ", べ: "へ", ぼ: "ほ",
 //     ぱ: "は", ぴ: "ひ", ぷ: "ふ", ぺ: "へ", ぽ: "ほ",
      ガ: "カ", ギ: "キ", グ: "ク", ゲ: "ケ", ゴ: "コ",
      ザ: "サ", ジ: "シ", ズ: "ス", ゼ: "セ", ゾ: "ソ",
      ダ: "タ", ヂ: "チ", ヅ: "ツ", デ: "テ", ド: "ト",
      バ: "ハ", ビ: "ヒ", ブ: "フ", ベ: "ヘ", ボ: "ホ",
      パ: "ハ", ピ: "ヒ", プ: "フ", ペ: "ヘ", ポ: "ホ",
      ヴ: "ウ",
    };
  
    const smallKanaMap = {
//      ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お",
//      ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ",
      ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ",
      ャ: "ヤ", ュ: "ユ", ョ: "ヨ", ッ: "ツ"
    };
  
    return [...str].map(ch => {
      if (ch === "ー") return ch;
      return dakutenMap[ch] || smallKanaMap[ch] || ch;
    }).join("");
  }

  
  function countCharacters(w1, w2) {
    const count = {};
    const normalized = normalizeKana(w1 + w2);
    [...normalized].forEach(ch => {
      count[ch] = (count[ch] || 0) + 1;
    });
    return count;
  }
  

  function renderGrid(counts) {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
  
    GOJUUON.flat().forEach((ch, index) => {
      const div = document.createElement("div");
      const count = counts[ch] || 0;
  
      div.className = `cell count-${Math.min(count, 5)}`;
      div.style.animationDelay = `${index * 20}ms`;
  
      if (ch) {
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.height = "100%";
        table.style.borderCollapse = "collapse";
  
        const tbody = document.createElement("tbody");
  
        // 1行目：文字
        const tr1 = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.textContent = ch;
        td1.style.textAlign = "center";
        td1.style.fontWeight = "bold";
        tr1.appendChild(td1);
  
        // 2行目：回数（あれば）
        const tr2 = document.createElement("tr");
        const td2 = document.createElement("td");
        td2.textContent = count > 0 ? `×${count}` : "";
        td2.style.textAlign = "center";
        td2.style.fontSize = "0.8em";
        tr2.appendChild(td2);
  
        tbody.appendChild(tr1);
        tbody.appendChild(tr2);
        table.appendChild(tbody);
  
        div.appendChild(table);
      }
  
      grid.appendChild(div);
    });
  }
  
  

  function checkAnswer() {
    const g1 = document.getElementById("guess1").value.trim();
    const g2 = document.getElementById("guess2").value.trim();
    const result = document.getElementById("result");
  
    const normalize = (s) => [...normalizeKana(s)].sort().join("");
    const isCorrect =
      normalize(g1) === normalize(word1) &&
      normalize(g2) === normalize(word2);
  
    result.classList.remove("bounce");
    void result.offsetWidth;
  
    if (isCorrect) {
        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
        const gameUrl = "https://example.com";
        const shareText = `今日の2匹を見破った！ (${timeTaken}秒)\n${gameUrl}\n#ポケモンセパレーション`;
        const shareUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);
    
        result.innerHTML = `🎉 Congratulations！ (${timeTaken} 秒)<br>
          <a href="${shareUrl}" target="_blank" class="btn btn-outline-success mt-2">
            X(Twitter)でシェアする
          </a>`;
        result.style.color = "green";
    } else {
      result.textContent = "❌ 不正解";
      result.style.color = "red";
    }
  
    result.classList.add("bounce");
  }

renderGrid([]);

document.getElementById("startButton").addEventListener("click", () => {
    [word1, word2] = getTodayWordPair();
    const counts = countCharacters(word1, word2);
    renderGrid(counts);
  
    // 表示切り替え
    document.getElementById("gameArea").style.display = "block";
    document.getElementById("startButton").style.display = "none";
  
    // 入力欄初期化
    document.getElementById("guess1").value = "";
    document.getElementById("guess2").value = "";
    document.getElementById("result").textContent = "";
  
    // タイマー開始
    startTime = Date.now();
    console.log("今日のポケモン:", word1, word2);
  });
  
