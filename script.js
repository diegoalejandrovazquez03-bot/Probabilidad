document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES GLOBALES (Encapsuladas en el módulo) ---
    let currentData = [];
    
    // --- REFERENCIAS DOM ---
    const elements = {
        navButtons: document.querySelectorAll('#mainNav button'),
        sections: document.querySelectorAll('main section'),
        themeToggle: document.querySelector('.theme-toggle'),
        inputs: document.querySelectorAll('input'),
        // Descriptiva
        dataInput: document.getElementById('dataInput'),
        btnRandom: document.getElementById('btnRandom'),
        btnCalcDesc: document.getElementById('btnCalcDesc'),
        // Frecuencias
        btnFreq: document.getElementById('btnFreq'),
        freqTableBody: document.querySelector('#freqTable tbody'),
        // Gráficos
        btnHist: document.getElementById('btnHist'),
        btnPoly: document.getElementById('btnPoly'),
        btnOgive: document.getElementById('btnOgive'),
        btnPareto: document.getElementById('btnPareto'),
        canvasStats: document.getElementById('statsCanvas'),
        graphTitle: document.getElementById('graphTitle'),
        // Conjuntos
        setU: document.getElementById('setU'),
        setA: document.getElementById('setA'),
        setB: document.getElementById('setB'),
        btnUnion: document.getElementById('btnUnion'),
        btnInter: document.getElementById('btnInter'),
        btnDiffAB: document.getElementById('btnDiffAB'),
        btnDiffBA: document.getElementById('btnDiffBA'),
        btnCompA: document.getElementById('btnCompA'),
        setResult: document.getElementById('setResult'),
        // Probabilidad
        probFav: document.getElementById('probFav'),
        probTotal: document.getElementById('probTotal'),
        btnProb: document.getElementById('btnProb'),
        // Árbol
        probA: document.getElementById('probA'),
        probBgivenA: document.getElementById('probBgivenA'),
        btnTree: document.getElementById('btnTree'),
        canvasTree: document.getElementById('treeCanvas'),
        // Combinatoria
        combN: document.getElementById('combN'),
        combR: document.getElementById('combR'),
        btnComb: document.getElementById('btnComb')
    };

    // --- HELPER: COLORES CSS ---
    function getCSSVar(variable) {
        return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    }

    function getThemeColors() {
        return {
            primary: getCSSVar('--primary'),
            secondary: getCSSVar('--secondary'),
            accent: getCSSVar('--accent'),
            text: getCSSVar('--text-primary'),
            grid: document.body.classList.contains('dark-mode') ? '#444' : '#eee'
        };
    }

    // --- NAVEGACIÓN SPA ---
    function showSection(id) {
        elements.sections.forEach(sec => sec.classList.remove('active'));
        const target = document.getElementById(id);
        if(target) target.classList.add('active');

        elements.navButtons.forEach(btn => {
            btn.classList.remove('active');
            if(btn.dataset.section === id) btn.classList.add('active');
        });
        
        // Resize canvas on tab switch to fix potential layout bugs
        resizeCanvas();
    }

    elements.navButtons.forEach(btn => {
        btn.addEventListener('click', () => showSection(btn.dataset.section));
    });

    // --- MODO OSCURO ---
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        elements.themeToggle.textContent = isDark ? 'Modo Claro' : 'Modo Oscuro';
        
        // Redibujar gráficos activos
        const currentSection = document.querySelector('section.active').id;
        if(currentSection === 'graficos') {
            const title = elements.graphTitle.innerText;
            if(title.includes('Histograma')) drawHistogram();
            else if(title.includes('Polígono')) drawPolygon();
            else if(title.includes('Ojiva')) drawOgive();
            else if(title.includes('Pareto')) drawPareto();
        } else if (currentSection === 'arbol') {
            calcMultiplicative();
        }
    }

    elements.themeToggle.addEventListener('click', toggleDarkMode);

    // --- INPUT PARSING ROBUSTO ---
    function parseData(inputElement) {
        const val = inputElement.value;
        if(!val.trim()) return [];
        // Soporta comas, espacios, tabuladores y saltos de línea
        return val.split(/[\s,]+/)
                  .map(n => parseFloat(n.trim()))
                  .filter(n => !isNaN(n));
    }

    // --- ESTADÍSTICA DESCRIPTIVA ---
    function generateRandomData() {
        const arr = Array.from({length: 20}, () => Math.floor(Math.random() * 100) + 1);
        elements.dataInput.value = arr.join(', ');
        calculateDescriptive();
    }

    function calculateDescriptive() {
        currentData = parseData(elements.dataInput);
        if(currentData.length === 0) {
            alert("Por favor ingresa datos numéricos válidos.");
            return;
        }
        
        currentData.sort((a, b) => a - b);
        const n = currentData.length;
        const sum = currentData.reduce((a, b) => a + b, 0);
        const media = sum / n;
        const min = currentData[0];
        const max = currentData[n-1];
        
        // Mediana
        let mediana = (n % 2 === 0) 
            ? (currentData[n/2 - 1] + currentData[n/2]) / 2 
            : currentData[Math.floor(n/2)];

        // Moda
        const counts = {};
        currentData.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
        let maxFreq = 0;
        let modas = [];
        for(const key in counts) {
            const freq = counts[key];
            if(freq > maxFreq) {
                maxFreq = freq;
                modas = [key];
            } else if(freq === maxFreq) {
                modas.push(key);
            }
        }
        const modaStr = (modas.length === n || maxFreq === 1) ? "Sin moda" : modas.join(', ');

        const variance = currentData.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / (n - 1);
        
        // Actualizar UI
        document.getElementById('resMedia').innerText = media.toFixed(2);
        document.getElementById('resMediana').innerText = mediana;
        document.getElementById('resModa').innerText = modaStr;
        document.getElementById('resMin').innerText = min;
        document.getElementById('resMax').innerText = max;
        document.getElementById('resRango').innerText = max - min;
        document.getElementById('resVarianza').innerText = variance.toFixed(2);
        document.getElementById('resDesv').innerText = Math.sqrt(variance).toFixed(2);
    }

    elements.btnRandom.addEventListener('click', generateRandomData);
    elements.btnCalcDesc.addEventListener('click', calculateDescriptive);

    // --- TABLA DE FRECUENCIAS ---
    function generateFrequencyTable() {
        if(currentData.length === 0) {
            // Intentar leer si el usuario no calculó antes
            currentData = parseData(elements.dataInput);
            if(currentData.length === 0) {
                alert("Primero ingresa datos en la sección 'Estadística Descriptiva'.");
                showSection('descriptiva');
                return;
            }
            currentData.sort((a, b) => a - b);
        }

        const counts = {};
        currentData.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
        const uniqueVals = [...new Set(currentData)].sort((a, b) => a - b);
        const n = currentData.length;
        
        let html = '';
        let Fi = 0;
        let Fr_acc = 0;

        uniqueVals.forEach(val => {
            const fi = counts[val];
            const fr = fi / n;
            Fi += fi;
            Fr_acc += fr;

            html += `<tr>
                <td>${val}</td>
                <td>${fi}</td>
                <td>${fr.toFixed(4)}</td>
                <td>${Fi}</td>
                <td>${Fr_acc.toFixed(4)}</td>
            </tr>`;
        });
        elements.freqTableBody.innerHTML = html;
    }

    elements.btnFreq.addEventListener('click', generateFrequencyTable);

    // --- CANVAS HELPER ---
    function resizeCanvas() {
        const container = elements.canvasStats.parentElement;
        elements.canvasStats.width = container.clientWidth;
        // Altura fija o proporcional
        elements.canvasStats.height = 400; 
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Init

    function getCanvasCtx() {
        const ctx = elements.canvasStats.getContext('2d');
        ctx.clearRect(0, 0, elements.canvasStats.width, elements.canvasStats.height);
        return { canvas: elements.canvasStats, ctx };
    }

    function getFreqData() {
        if(!currentData.length) currentData = parseData(elements.dataInput);
        if(!currentData.length) return null;
        
        currentData.sort((a,b) => a-b);
        const counts = {};
        currentData.forEach(x => counts[x] = (counts[x] || 0) + 1);
        const labels = Object.keys(counts).map(Number).sort((a,b)=>a-b);
        const data = labels.map(l => counts[l]);
        return { labels, data };
    }

    function drawAxes(ctx, w, h, pad, maxVal, labels) {
        const colors = getThemeColors();
        ctx.beginPath();
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        // Ejes
        ctx.moveTo(pad, pad);
        ctx.lineTo(pad, h - pad);
        ctx.lineTo(w - pad, h - pad);
        ctx.stroke();

        // Etiquetas
        ctx.fillStyle = colors.text;
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'center';
        
        const stepX = (w - 2 * pad) / labels.length;
        labels.forEach((lbl, i) => {
            ctx.fillText(lbl, pad + stepX * i + (stepX/2), h - pad + 20);
        });

        ctx.textAlign = 'right';
        const stepY = (h - 2 * pad) / 5;
        const valStep = maxVal / 5;
        for(let i=0; i<=5; i++) {
            const y = h - pad - (stepY * i);
            ctx.fillText((valStep * i).toFixed(1), pad - 10, y + 5);
            
            // Grid
            ctx.beginPath();
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            ctx.moveTo(pad, y);
            ctx.lineTo(w - pad, y);
            ctx.stroke();
        }
    }

    // --- GRÁFICOS ---
    function drawHistogram() {
        const freq = getFreqData();
        if(!freq) return alert("No hay datos para graficar.");
        const { canvas, ctx } = getCanvasCtx();
        const colors = getThemeColors();
        const pad = 50;
        const w = canvas.width;
        const h = canvas.height;
        const maxVal = Math.max(...freq.data) + 1;

        drawAxes(ctx, w, h, pad, maxVal, freq.labels);
        elements.graphTitle.innerText = "Histograma";

        const stepX = (w - 2 * pad) / freq.labels.length;
        const chartH = h - 2 * pad;

        ctx.fillStyle = colors.primary; // Usar variable CSS
        ctx.strokeStyle = colors.secondary;

        freq.data.forEach((val, i) => {
            const barH = (val / maxVal) * chartH;
            const x = pad + (stepX * i);
            const y = h - pad - barH;
            ctx.fillRect(x, y, stepX - 2, barH);
            ctx.strokeRect(x, y, stepX - 2, barH);
        });
    }

    function drawPolygon() {
        const freq = getFreqData();
        if(!freq) return alert("No hay datos.");
        const { canvas, ctx } = getCanvasCtx();
        const colors = getThemeColors();
        const pad = 50;
        const w = canvas.width;
        const h = canvas.height;
        const maxVal = Math.max(...freq.data) + 1;

        drawAxes(ctx, w, h, pad, maxVal, freq.labels);
        elements.graphTitle.innerText = "Polígono de Frecuencias";

        const stepX = (w - 2 * pad) / freq.labels.length;
        const chartH = h - 2 * pad;

        ctx.beginPath();
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 3;
        ctx.moveTo(pad, h - pad);

        freq.data.forEach((val, i) => {
            const barH = (val / maxVal) * chartH;
            const x = pad + (stepX * i) + (stepX/2);
            const y = h - pad - barH;
            ctx.lineTo(x, y);
            
            // Puntos
            const prevFill = ctx.fillStyle;
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(x-3, y-3, 6, 6);
            ctx.fillStyle = prevFill;
            ctx.moveTo(x, y); // Restaurar cursor
        });
        
        ctx.lineTo(w - pad, h - pad);
        ctx.stroke();
    }

    function drawOgive() {
        const freq = getFreqData();
        if(!freq) return alert("No hay datos.");
        const { canvas, ctx } = getCanvasCtx();
        const colors = getThemeColors();
        const pad = 50;
        const w = canvas.width;
        const h = canvas.height;

        let acc = 0;
        const accumData = freq.data.map(v => acc += v);
        const total = acc;

        drawAxes(ctx, w, h, pad, total, freq.labels);
        elements.graphTitle.innerText = "Ojiva";

        const stepX = (w - 2 * pad) / freq.labels.length;
        const chartH = h - 2 * pad;

        ctx.beginPath();
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 3;
        ctx.moveTo(pad, h - pad);

        accumData.forEach((val, i) => {
            const valH = (val / total) * chartH;
            const x = pad + (stepX * i) + stepX;
            const y = h - pad - valH;
            ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Puntos
        accumData.forEach((val, i) => {
            const valH = (val / total) * chartH;
            const x = pad + (stepX * i) + stepX;
            const y = h - pad - valH;
            ctx.beginPath();
            ctx.fillStyle = colors.accent;
            ctx.arc(x, y, 4, 0, Math.PI*2);
            ctx.fill();
        });
    }

    function drawPareto() {
        const freq = getFreqData();
        if(!freq) return alert("No hay datos.");
        const { canvas, ctx } = getCanvasCtx();
        const colors = getThemeColors();
        const pad = 50;
        const w = canvas.width;
        const h = canvas.height;

        const pareto = freq.labels.map((lbl, i) => ({ lbl, val: freq.data[i] }))
                                .sort((a, b) => b.val - a.val);
        const labels = pareto.map(d => d.lbl);
        const vals = pareto.map(d => d.val);
        const maxVal = Math.max(...vals);
        const total = vals.reduce((a,b)=>a+b,0);

        drawAxes(ctx, w, h, pad, maxVal, labels);
        elements.graphTitle.innerText = "Pareto";

        const stepX = (w - 2 * pad) / labels.length;
        const chartH = h - 2 * pad;

        // Barras
        ctx.fillStyle = colors.accent;
        vals.forEach((val, i) => {
            const barH = (val / maxVal) * chartH;
            const x = pad + (stepX * i);
            const y = h - pad - barH;
            ctx.fillRect(x+2, y, stepX-4, barH);
        });

        // Línea Acumulada
        let currentAcc = 0;
        ctx.beginPath();
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 3;
        
        vals.forEach((val, i) => {
            currentAcc += val;
            const perc = currentAcc / total;
            const y = h - pad - (perc * chartH);
            const x = pad + (stepX * i) + (stepX/2);
            
            if(i===0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    elements.btnHist.addEventListener('click', drawHistogram);
    elements.btnPoly.addEventListener('click', drawPolygon);
    elements.btnOgive.addEventListener('click', drawOgive);
    elements.btnPareto.addEventListener('click', drawPareto);

    // --- CONJUNTOS ---
    function getSet(input) {
        return new Set(parseData(input));
    }

    function displaySet(set) {
        if(set.size === 0) return "Ø";
        return "{ " + Array.from(set).join(', ') + " }";
    }

    function calcSet(op) {
        const U = getSet(elements.setU);
        const A = getSet(elements.setA);
        const B = getSet(elements.setB);
        let res = new Set();

        switch(op) {
            case 'union': res = new Set([...A, ...B]); break;
            case 'inter': res = new Set([...A].filter(x => B.has(x))); break;
            case 'diffAB': res = new Set([...A].filter(x => !B.has(x))); break;
            case 'diffBA': res = new Set([...B].filter(x => !A.has(x))); break;
            case 'compA': 
                if(U.size === 0) return alert("Define el Universo U");
                res = new Set([...U].filter(x => !A.has(x))); 
                break;
        }
        elements.setResult.innerText = displaySet(res);
    }

    elements.btnUnion.addEventListener('click', () => calcSet('union'));
    elements.btnInter.addEventListener('click', () => calcSet('inter'));
    elements.btnDiffAB.addEventListener('click', () => calcSet('diffAB'));
    elements.btnDiffBA.addEventListener('click', () => calcSet('diffBA'));
    elements.btnCompA.addEventListener('click', () => calcSet('compA'));

    // --- PROBABILIDAD ---
    elements.btnProb.addEventListener('click', () => {
        const fav = parseFloat(elements.probFav.value);
        const total = parseFloat(elements.probTotal.value);
        if(isNaN(fav) || isNaN(total) || total === 0) return alert("Datos inválidos");
        
        const p = fav / total;
        document.getElementById('resProbDec').innerText = p.toFixed(4);
        document.getElementById('resProbPerc').innerText = (p * 100).toFixed(2) + "%";
    });

    // --- ÁRBOL ---
    function calcMultiplicative() {
        const pA = parseFloat(elements.probA.value);
        const pB = parseFloat(elements.probBgivenA.value);
        if(isNaN(pA) || isNaN(pB)) return alert("Datos inválidos");

        const res = pA * pB;
        document.getElementById('resMult').innerText = res.toFixed(4);

        // Draw Tree
        const canvas = elements.canvasTree;
        const ctx = canvas.getContext('2d');
        const colors = getThemeColors();
        
        ctx.clearRect(0,0, canvas.width, canvas.height);
        ctx.font = "14px Segoe UI";
        ctx.fillStyle = colors.text;
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;

        const startX = 50, startY = 150;
        const l2X = 300, l3X = 500;

        // Raíz
        ctx.beginPath(); ctx.arc(startX, startY, 5, 0, 6.28); ctx.fill();

        // Ramas
        function drawBranch(x1, y1, x2, y2, text) {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.fillText(text, (x1+x2)/2 - 20, (y1+y2)/2 - 10);
            ctx.beginPath(); ctx.arc(x2, y2, 4, 0, 6.28); ctx.fill();
        }

        drawBranch(startX, startY, l2X, 50, `A (${pA})`);
        drawBranch(startX, startY, l2X, 250, `A' (${(1-pA).toFixed(2)})`);
        drawBranch(l2X, 50, l3X, 20, `B|A (${pB})`);

        ctx.fillStyle = colors.accent;
        ctx.fillText(`P(A∩B) = ${res.toFixed(4)}`, l3X - 80, 20);
    }
    elements.btnTree.addEventListener('click', calcMultiplicative);

    // --- COMBINATORIA ---
    function factorial(n) {
        if(n<0) return -1;
        if(n===0) return 1;
        let r=1; for(let i=1;i<=n;i++) r*=i;
        return r;
    }

    elements.btnComb.addEventListener('click', () => {
        const n = parseInt(elements.combN.value);
        const r = parseInt(elements.combR.value);
        if(isNaN(n) || isNaN(r) || n<0 || r<0 || r>n) return alert("Datos inválidos");

        const nPr = factorial(n) / factorial(n-r);
        const nCr = factorial(n) / (factorial(r) * factorial(n-r));

        document.getElementById('resNpr').innerText = nPr.toLocaleString();
        document.getElementById('resNcr').innerText = nCr.toLocaleString();
    });

    // --- TECLADO (ENTER) ---
    elements.inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                const section = input.closest('section');
                const btn = section.querySelector('button.action-btn');
                if(btn) btn.click();
            }
        });
    });

    // Init
    generateRandomData();
});
