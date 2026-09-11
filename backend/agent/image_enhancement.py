import cv2
import numpy as np

def enhance_image(image_bytes):
    print(" Image Enhancement Executed")
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    denoised = cv2.fastNlMeansDenoising(gray)

    enhanced = cv2.equalizeHist(denoised)

    _, buffer = cv2.imencode(".jpg", enhanced)

    return buffer.tobytes()