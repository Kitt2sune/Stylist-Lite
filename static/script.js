const canvas = document.getElementById('mainCanvas'), ctx = canvas.getContext('2d');
const maskCanvas = document.createElement('canvas'), maskCtx = maskCanvas.getContext('2d');
let points = [], originalImg = new Image(), isLoaded = false;

const getBlob = (source) => new Promise(res => {
    const c = document.createElement('canvas');
    c.width = source.width; c.height = source.height;
    c.getContext('2d').drawImage(source, 0, 0);
    c.toBlob(res, 'image/png');
});

const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
};

const draw = () => {
    ctx.drawImage(originalImg, 0, 0);
    if (!points.length) return;
    
    ctx.beginPath(); ctx.strokeStyle = ctx.fillStyle = "#00ff00"; ctx.lineWidth = 2;
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => {
        ctx.lineTo(p.x, p.y);
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.stroke();
};

let initialImgData = null; 

window.downloadImage = () => {
    const a = document.createElement('a');
    a.download = 'result.png'; a.href = canvas.toDataURL(); a.click();
};

document.getElementById('upload').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        originalImg.onload = () => {
            canvas.width = maskCanvas.width = originalImg.width;
            canvas.height = maskCanvas.height = originalImg.height;
            initialImgData = ev.target.result;
            isLoaded = true; draw();
        };
        originalImg.src = ev.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
};

canvas.onclick = (e) => { if (isLoaded) { points.push(getPos(e)); draw(); } };

canvas.onmousemove = (e) => {
    if (!points.length) return;
    draw();
    const pos = getPos(e), last = points[points.length - 1];
    ctx.setLineDash([5, 5]); ctx.beginPath();
    ctx.moveTo(last.x, last.y); ctx.lineTo(pos.x, pos.y);
    ctx.stroke(); ctx.setLineDash([]);
};

canvas.ondblclick = () => {
    if (points.length < 3) return;
    maskCtx.fillStyle = "black"; maskCtx.fillRect(0, 0, canvas.width, canvas.height);
    maskCtx.fillStyle = "white"; maskCtx.beginPath();
    maskCtx.moveTo(points[0].x, points[0].y);
    points.forEach(p => maskCtx.lineTo(p.x, p.y));
    maskCtx.fill(); points = []; draw();
    applyColor();
};

window.saveCurrentLayer = () => {
    originalImg.src = canvas.toDataURL();
    originalImg.onload = () => {
        maskCtx.fillStyle = "black"; maskCtx.fillRect(0, 0, canvas.width, canvas.height);
        document.getElementById('brightness').value = 0;
        document.getElementById('status').innerText = "Запечено";
    };
};

async function applyColor() {
    if (!isLoaded) return;
    const fd = new FormData();
    fd.append('image', await getBlob(originalImg));
    fd.append('mask', await getBlob(maskCanvas));
    fd.append('color', document.getElementById('colorPicker').value);
    fd.append('brightness', document.getElementById('brightness').value);
    fd.append('opacity', document.getElementById('opacity').value);

    try {
        const resp = await fetch('/api/recolor', { method: 'POST', body: fd });
        const resImg = new Image();
        resImg.onload = () => ctx.drawImage(resImg, 0, 0);
        resImg.src = URL.createObjectURL(await resp.blob());
    } catch (err) { console.error(err); }
}

// Функция полного сброса
window.resetToOriginal = () => {
    if (!initialImgData) return;
    
    originalImg.src = initialImgData;
    originalImg.onload = () => {
        // Очищаем маску
        maskCtx.fillStyle = "black";
        maskCtx.fillRect(0, 0, canvas.width, canvas.height);
        points = [];
        
        // Сбрасываем ползунки в интерфейсе
        document.getElementById('brightness').value = 0;
        document.getElementById('opacity').value = 100;
        
        draw();
        document.getElementById('status').innerText = "Вернулись к оригиналу";
    };
};
