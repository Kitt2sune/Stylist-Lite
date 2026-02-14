from flask import Flask, render_template, request, send_file
import cv2
import numpy as np
import io

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/recolor', methods=['POST'])
def recolor():
    try:
        img = request.files['image'].read()
        mask = request.files['mask'].read()
        color = request.form.get('color', '#ff0000').lstrip('#')
        bright = int(request.form.get('brightness', 0))
        opacity = int(request.form.get('opacity', 100)) / 100.0

        img = cv2.imdecode(np.frombuffer(img, np.uint8), 1)
        mask = cv2.imdecode(np.frombuffer(mask, np.uint8), 0)

        soft_mask = cv2.GaussianBlur(mask, (7, 7), 0) / 255.0 * opacity
        alpha = cv2.merge([soft_mask] * 3)

        rgb = [int(color[i:i+2], 16) for i in (0, 2, 4)]
        hsv = cv2.cvtColor(np.uint8([[[rgb[2], rgb[1], rgb[0]]]]), cv2.COLOR_BGR2HSV)[0][0]

        h, s, v = cv2.split(cv2.cvtColor(img, cv2.COLOR_BGR2HSV))
        
        new_h = np.full_like(h, hsv[0])
        new_s = np.full_like(s, hsv[1])
        new_v = np.clip(v.astype(np.int16) + bright, 0, 255).astype(np.uint8)

        bgr = cv2.cvtColor(cv2.merge([new_h, new_s, new_v]), cv2.COLOR_HSV2BGR)
        result = (alpha * bgr + (1 - alpha) * img).astype(np.uint8)

        buf = cv2.imencode('.png', result)
        return send_file(io.BytesIO(buf), mimetype='image/png')

    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)